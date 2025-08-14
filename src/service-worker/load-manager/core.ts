import browser, { Downloads } from 'webextension-polyfill';
import logger from '../../lib/logger';

import { Mutex } from 'async-mutex';
import { getFromStorage } from '../../lib/storage';
import {
  EventMessage,
  EventType,
  FileItem,
  Initiator,
  LoadItem,
  LoadStatus,
} from '../../lib/types';
import { QueueController } from './queue';
import { HDrezkaLoader, SiteLoader } from './site-loader';
import OnChangedDownloadDeltaType = Downloads.OnChangedDownloadDeltaType;
import DownloadItem = Downloads.DownloadItem;

type LoadManagerAsyncParams = {
  controller: QueueController;
};

export class DownloadManager {
  private mutex = new Mutex();

  private queueController: QueueController;
  private siteLoaderFactory: Record<
    string,
    new (...args: any[]) => SiteLoader
  > = {
    hdrezka: HDrezkaLoader,
  };

  constructor(async_param: LoadManagerAsyncParams | undefined) {
    if (typeof async_param === 'undefined') {
      throw new Error('Cannot be called directly');
    }

    this.queueController = async_param.controller;
  }

  static async build() {
    const async_result = await this.asyncConstructor();
    return new DownloadManager(async_result);
  }

  private static async asyncConstructor(): Promise<LoadManagerAsyncParams> {
    return {
      controller: await QueueController.build(),
    };
  }

  async stabilizeInsideState() {
    // TODO: реализовать
  }

  async initNewDownload(initiator: Initiator) {
    // Отвечает за добавление фильмов/сериалов в очередь на загрузку
    logger.debug('Trigger new load:', initiator);

    await this.queueController.initializeNewDownload(initiator);
    this.mutex.runExclusive(this.startNextDownload.bind(this)).then();
  }

  async startNextDownload() {
    // Отвечает за получение объекта на основе которого будет
    // производиться загрузка, а так же за его подготовку к загрузке
    logger.info('Attempt starting download.');

    const nextLoadItemId =
      await this.queueController.getNextObjectIdForDownload();

    if (!nextLoadItemId) {
      logger.info('Currently there are no available objects for loading.');
      return;
    }
    logger.debug('Next load item id:', nextLoadItemId);

    const tx = indexedDBObject.transaction('loadStorage', 'readwrite');

    const loadStorage = tx.objectStore('loadStorage');
    const loadStorageIndex = loadStorage.index('load_id');

    const nextLoadItem = (await loadStorageIndex.get(
      nextLoadItemId,
    )) as LoadItem;
    if (nextLoadItem.status !== LoadStatus.DownloadCandidate) {
      logger.warning('The start of the load initialization is interrupted.');
      return;
    }
    nextLoadItem.status = LoadStatus.InitiatingDownload;

    await loadStorage.put(nextLoadItem);
    tx.done;

    const siteLoader = this.siteLoaderFactory[nextLoadItem.siteType];
    const siteLoadItem = await siteLoader.build(nextLoadItem);

    const fileTypePriority =
      (await getFromStorage<'video' | 'subtitle'>('fileTypePriority')) ??
      'video';

    const [videoFile, subtitleFile] = await siteLoadItem.createAndGetFile();
    const targetFile =
      fileTypePriority === 'video'
        ? (videoFile ?? subtitleFile!)
        : (subtitleFile ?? videoFile!);

    targetFile.dependentFileItemId =
      targetFile === videoFile
        ? (subtitleFile?.id ?? null)
        : (videoFile?.id ?? null);

    targetFile.status = LoadStatus.InitiatingDownload;
    await indexedDBObject.put('fileStorage', targetFile);

    this.launchFileDownload(targetFile).then();
    this.mutex.runExclusive(this.startNextDownload.bind(this)).then();
  }

  async launchFileDownload(fileItem: FileItem) {
    // Запускает загрузку конкретного файла
    logger.debug('Launching file download:', fileItem);

    if (fileItem.status !== LoadStatus.InitiatingDownload) {
      logger.info(
        'File download is interrupted - incorrect status:',
        fileItem.status,
      );
      return;
    }

    if (fileItem.downloadId !== null) {
      // Мы должны удалить старую связь с объектом загрузки браузера
      // ибо когда загрузка будет удалена из истории: браузер вызовет
      // событие USER_CANCELED. Из-за чего файлы будут удалены из активных
      // загрузок и расширение не сможет корректно отслеживать загрузки.
      fileItem.downloadId = null;
      await indexedDBObject.put('fileStorage', fileItem);
    }

    try {
      if (fileItem.url === null) {
        logger.warning('File download failed - no url:', fileItem);
        await this.newAttemptDownload(fileItem, LoadStatus.InitiationError);
        return;
      }

      // TODO: брать время из настроек
      fileItem.downloadId = await browser.downloads.download({
        url: fileItem.url,
        filename: fileItem.fileName,
        saveAs: fileItem.saveAs,
      });
      fileItem.status = LoadStatus.Downloading;
      await indexedDBObject.put('fileStorage', fileItem);
      logger.info('File download started successfully:', fileItem);
    } catch (e: any) {
      const error = e as Error;
      logger.error('Download start failed:', error.toString());
      await this.newAttemptDownload(fileItem, LoadStatus.InitiationError);
    }
  }

  handlerCreated(downloadItem: DownloadItem) {
    // Обработчик успешной инициализации загрузки браузером
    logger.debug('Download has been created:', downloadItem);

    this.mutex.runExclusive(
      async () =>
        await this.eventOrchestrator({
          type: EventType.Created,
          data: downloadItem,
        }),
    );
  }

  handlerDownloadEvent(downloadDelta: OnChangedDownloadDeltaType) {
    // Отслеживает события загрузок и принимает решения на их основе
    logger.debug('An event occurred:', downloadDelta);

    this.mutex.runExclusive(
      async () =>
        await this.eventOrchestrator({
          type: EventType.DownloadEvent,
          data: downloadDelta,
        }),
    );
  }

  handlerDeterminingFilename(downloadItem: DownloadItem, suggest: Function) {
    // Функция "рекомендации" имени файла. Обязательно должна быть синхронной!
    // Возвращает true указывая что рекомендация будет дана асинхронно.
    logger.debug('Request for defining file name:', downloadItem);

    indexedDBObject
      .getAllFromIndex('fileStorage', 'download_id', downloadItem.id)
      .then((fileItems) => {
        const fileItemsList = fileItems as FileItem[];
        const file = fileItemsList.length
          ? fileItemsList.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
          : null;
        return file?.fileName;
      })
      .then((suggestFileName) => {
        if (!suggestFileName) suggest();
        else
          suggest({
            conflictAction: 'uniquify',
            filename: suggestFileName,
          });
      });
    return true;
  }

  async eventOrchestrator(event: EventMessage | undefined) {
    if (event === undefined) return;
    logger.debug('Processing of the event:', event);

    const fileItems = (await indexedDBObject.getAllFromIndex(
      'fileStorage',
      'download_id',
      event.data.id,
    )) as FileItem[];

    // Если пользователь очистит историю загрузок в браузере,
    // то браузер начнёт создавать новые загрузки с id от 1.
    // Что потенциально может создать ситуацию, когда у нас
    // в базе будет лежать несколько FileItem с одинаковым downloadId.
    // В таком случае нас интересует только последний созданный FileItem.
    const file = fileItems.length
      ? fileItems.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
      : null;

    if (!file) {
      // Игнорируем загрузки вызванные НЕ нашим расширением
      logger.warning(
        'The related file was not found in the storage.',
        event.data,
      );
      return;
    }

    if (event.type === EventType.Created) {
      const downloadItem: DownloadItem = event.data;

      await this.createDownload(file, downloadItem);
    } else if (event.type === EventType.DownloadEvent) {
      const downloadDelta: OnChangedDownloadDeltaType = event.data;

      if (downloadDelta.state?.current === 'complete') {
        await this.successDownload(file);
      } else if (downloadDelta.error?.current === 'USER_CANCELED') {
        await this.cancelDownload(file);
      } else if (downloadDelta.error?.current) {
        logger.error('Download failed:', downloadDelta.error.current);
        await this.newAttemptDownload(file, LoadStatus.DownloadFailed);
      }

      if (downloadDelta.paused?.current === true) {
        await this.pauseDownload(file);
      } else if (downloadDelta.paused?.current === false) {
        await this.unpauseDownload(file);
      }
    } else {
      logger.critical('Unknown event type:', event);
      throw new Error('Unknown event type');
    }
  }

  async createDownload(fileItem: FileItem, downloadItem: DownloadItem) {
    if (fileItem.status === LoadStatus.StoppedByUser) {
      // Иногда старт загрузки задерживается, в то время как она уже была
      // отменена. В этом случае необходимо отменить загрузку при старте
      await browser.downloads.cancel(downloadItem.id);
      await browser.downloads.erase({ id: downloadItem.id });

      logger.warning('Download created interrupted - StoppedByUser:', fileItem);
    } else if (downloadItem.state === 'in_progress') {
      // Мы должны проверить статус загрузки т.к. иногда
      // браузер отправляет устаревшие события
      fileItem.status = LoadStatus.Downloading;
      fileItem.url = downloadItem.url;
      await indexedDBObject.put('fileStorage', fileItem);

      const loadItem = (await indexedDBObject.getFromIndex(
        'loadStorage',
        'load_id',
        fileItem.relatedLoadItemId,
      )) as LoadItem;

      if (loadItem.status !== LoadStatus.Downloading) {
        loadItem.status = LoadStatus.Downloading;
        await indexedDBObject.put('loadStorage', loadItem);
      }

      logger.info(
        'Status "Loading" was successfully established for:',
        fileItem,
      );
    }
  }

  async successDownload(fileItem: FileItem) {
    // Обработчик успешного завершения загрузки
    logger.debug('The load is completed successfully:', fileItem);

    fileItem.status = LoadStatus.DownloadSuccess;
    await indexedDBObject.put('fileStorage', fileItem);

    if (fileItem.dependentFileItemId !== null) {
      logger.info('Found a related file for downloading.');
      const nextFileItem = (await indexedDBObject.getFromIndex(
        'fileStorage',
        'file_id',
        fileItem.dependentFileItemId,
      )) as FileItem;
      nextFileItem.status = LoadStatus.InitiatingDownload;
      await indexedDBObject.put('fileStorage', nextFileItem);
      await this.launchFileDownload(nextFileItem);
    } else {
      await this.queueController.successLoad(fileItem);
    }
    this.mutex.runExclusive(this.startNextDownload.bind(this)).then();
  }

  async cancelDownload(fileItem: FileItem) {
    // Обработчик остановки активной загрузки
    logger.info('Attempt stopped loading:', fileItem);

    if (
      ![
        LoadStatus.DownloadSuccess,
        LoadStatus.DownloadFailed,
        LoadStatus.StoppedByUser,
        LoadStatus.InitiationError,
      ].includes(fileItem.status)
    ) {
      fileItem.status = LoadStatus.StoppedByUser;
      await indexedDBObject.put('fileStorage', fileItem);

      const fileItemBrowser: DownloadItem | undefined = (
        await browser.downloads.search({
          id: fileItem.downloadId!,
        })
      )[0];

      if (fileItemBrowser?.state === 'in_progress') {
        await browser.downloads.cancel(fileItem.downloadId!);
      }
      await this.breakDownloadWithError(fileItem, LoadStatus.StoppedByUser);
    } else {
      logger.debug(
        'Attempt to stop loading interrupted - load is completed:',
        fileItem,
      );
    }
    this.mutex.runExclusive(this.startNextDownload.bind(this)).then();
  }

  async pauseDownload(fileItem: FileItem) {
    // Обработчик паузы загрузки
    logger.debug('Download paused:', fileItem);

    fileItem.status = LoadStatus.DownloadPaused;
    await indexedDBObject.put('fileStorage', fileItem);
    await browser.downloads.pause(fileItem.downloadId!);
  }

  async unpauseDownload(fileItem: FileItem) {
    // Обработчик возобновления загрузки после паузы
    logger.debug('Download resumed:', fileItem);

    fileItem.status = LoadStatus.Downloading;
    await indexedDBObject.put('fileStorage', fileItem);
    await browser.downloads.resume(fileItem.downloadId!);
  }

  async newAttemptDownload(fileItem: FileItem, cause: LoadStatus) {
    // Пытается повторить загрузку в случае неожиданного прерывания
    logger.warning('New load attempt:', fileItem);

    if (fileItem.status === LoadStatus.StoppedByUser) {
      logger.warning('New load attempt interrupted - StoppedByUser:', fileItem);
      this.mutex.runExclusive(this.startNextDownload.bind(this)).then();
      return;
    }

    const maxAttemptRetries =
      (await getFromStorage<number>('maxAttemptRetries')) ?? 3;

    if (fileItem.retryAttempts >= maxAttemptRetries) {
      logger.error(
        'New load attempt interrupted - Max attempts reached:',
        fileItem,
      );
      await this.breakDownloadWithError(fileItem, cause);
    } else {
      await this.repeatDownload(fileItem);
    }
  }

  async breakDownloadWithError(fileItem: FileItem, cause: LoadStatus) {
    fileItem.status = cause;
    await indexedDBObject.put('fileStorage', fileItem);
    await this.queueController.failLoad(fileItem, cause);

    logger.error('Loading stopped with error:', cause, fileItem);
    this.mutex.runExclusive(this.startNextDownload.bind(this)).then();
  }

  async repeatDownload(fileItem: FileItem) {
    logger.info('Start new load attempt:', fileItem);

    if (fileItem.downloadId) {
      // Удаляем старую загрузку из истории перед началом новой попытки
      await browser.downloads.erase({ id: fileItem.downloadId });
    }

    fileItem.retryAttempts++;
    fileItem.status = LoadStatus.InitiatingDownload;
    await indexedDBObject.put('fileStorage', fileItem);

    const timeOut = (await getFromStorage<number>('retryTimeout')) ?? 5000;
    return new Promise((resolve) => {
      setTimeout(async () => {
        const loadItem = (await indexedDBObject.getFromIndex(
          'loadStorage',
          'load_id',
          fileItem.relatedLoadItemId,
        )) as LoadItem;

        const siteLoader = this.siteLoaderFactory[loadItem.siteType];
        const siteLoadItem = await siteLoader.build(loadItem);

        fileItem.url =
          fileItem.fileType === 'video'
            ? await siteLoadItem.getVideoUrl()
            : await siteLoadItem.getSubtitlesUrl();
        await indexedDBObject.put('fileStorage', fileItem);

        resolve(await this.launchFileDownload(fileItem));
      }, timeOut);
    });
  }
}
