import { ResourceLockManager } from '@/lib/resource-lock-manager';
import {
  EventMessage,
  EventType,
  FileItem,
  Initiator,
  LoadItem,
  LoadStatus,
} from '@/lib/types';
import { loadIsCompleted } from '@/lib/utils';
import { Mutex } from 'async-mutex';
import type { Downloads } from 'webextension-polyfill';
import { QueueController } from './queue';
import { HDrezkaLoader, SiteLoader } from './site-loader';

type OnChangedDownloadDeltaType = Downloads.OnChangedDownloadDeltaType;
type DownloadItem = Downloads.DownloadItem;

type LoadManagerAsyncParams = {
  controller: QueueController;
};

export class DownloadManager {
  private mutex = new Mutex();
  private resourceLockManager = new ResourceLockManager();

  private readonly queueController: QueueController;
  private siteLoaderFactory: Record<
    string,
    { build: (downloadItem: LoadItem) => Promise<SiteLoader> }
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
    // При непредвиденном прерывании работы браузера (например отключение электричества),
    // может быть нарушена логика работы расширения, а данные потеряют актуальность.
    // Поэтому при старте браузера проводим аудит данных и в случае необходимости
    // восстанавливаем работоспособность расширения.
    // TODO: реализовать
  }

  async initNewDownload(initiator: Initiator) {
    // Отвечает за добавление фильмов/сериалов в очередь на загрузку
    logger.debug('Trigger new load:', initiator);

    await this.queueController.initializeNewDownload(initiator);
    this.startNextDownload().then();
  }

  private async startNextDownload() {
    // Отвечает за получение объекта, на основе которого будет
    // производиться загрузка, а также за его подготовку к загрузке
    logger.info('Attempt starting download.');

    // Вызов getNextObjectIdForDownload должен быть исключительно
    // последовательным, иначе количество загрузок будет выходить за лимит
    const nextLoadItemId = await this.mutex.runExclusive(
      this.queueController.getNextObjectIdForDownload.bind(
        this.queueController,
      ),
    );

    if (!nextLoadItemId) {
      logger.info('Currently there are no available objects for loading.');
      return;
    }
    logger.debug('Next load item id:', nextLoadItemId);
    await this.resourceLockManager.lock({
      type: 'loadStorage',
      id: nextLoadItemId,
    });

    const nextLoadItem = (await indexedDBObject.getFromIndex(
      'loadStorage',
      'load_id',
      nextLoadItemId,
    )) as LoadItem;

    if (nextLoadItem.status !== LoadStatus.DownloadCandidate) {
      logger.warning('The start of the load initialization is interrupted.');
      return;
    }
    nextLoadItem.status = LoadStatus.InitiatingDownload;

    await indexedDBObject.put('loadStorage', nextLoadItem);

    const siteLoader = this.siteLoaderFactory[nextLoadItem.siteType];
    const siteLoadItem = await siteLoader.build(nextLoadItem);

    const [videoFile, subtitleFile] = await siteLoadItem.createAndGetFile();
    const targetFile =
      settings.fileTypePriority === 'video'
        ? (videoFile ?? subtitleFile!)
        : (subtitleFile ?? videoFile!);

    targetFile.dependentFileItemId =
      targetFile === videoFile
        ? (subtitleFile?.id ?? null)
        : (videoFile?.id ?? null);

    targetFile.status = LoadStatus.InitiatingDownload;
    await indexedDBObject.put('fileStorage', targetFile);

    this.launchFileDownload(targetFile).then();
    this.startNextDownload().then();
  }

  private async launchFileDownload(fileItem: FileItem) {
    // Запускает загрузку конкретного файла
    logger.debug('Launching file download:', fileItem);

    if (fileItem.status !== LoadStatus.InitiatingDownload) {
      logger.info(
        'File download is interrupted - incorrect status:',
        fileItem.status,
      );
      this.resourceLockManager.unlock({
        type: 'loadStorage',
        id: fileItem.relatedLoadItemId,
      });
      return;
    }

    if (fileItem.downloadId !== null) {
      // Мы должны удалить старую связь с объектом загрузки браузера,
      // ибо, когда загрузка будет удалена из истории: браузер вызовет
      // событие USER_CANCELED. Из-за чего файлы будут удалены из активных
      // загрузок и расширение не сможет корректно отслеживать загрузки.
      fileItem.downloadId = null;
      await indexedDBObject.put('fileStorage', fileItem);
    }

    // Если при запросе URL с сервера, произойдёт сбой, URL будет установлен как NULL
    if (fileItem.url === null) {
      logger.warning('File download failed - no url:', fileItem);
      await this.attemptNewDownload(fileItem, LoadStatus.InitiationError);
      return;
    }

    try {
      const startInitiationDownloadTime = new Date().getTime();

      // TODO: Тут происходит ошибка с задержкой остановки загрузки: слишком долгая инициализация
      fileItem.downloadId = await browser.downloads.download({
        url: fileItem.url,
        filename: fileItem.fileName,
        saveAs: fileItem.saveAs,
      });

      const totalInitiationDownloadTime =
        new Date().getTime() - startInitiationDownloadTime;

      if (totalInitiationDownloadTime > 10_000) {
        logger.warning(
          `Loading start took too much time: ${totalInitiationDownloadTime / 1_000}s`,
          fileItem.url,
        );
      }

      await indexedDBObject.put('fileStorage', fileItem);
      logger.info('File download started successfully:', fileItem);

      this.resourceLockManager.unlock({
        type: 'loadStorage',
        id: fileItem.relatedLoadItemId,
      });
    } catch (e: any) {
      const error = e as Error;
      logger.error('Download start failed:', error.toString());
      await this.attemptNewDownload(fileItem, LoadStatus.InitiationError);
    }
  }

  handleCreateEvent(downloadItem: DownloadItem) {
    // Обработчик успешной инициализации загрузки браузером
    logger.debug('Download has been created:', downloadItem);

    this.eventOrchestrator({
      type: EventType.DownloadCreated,
      data: downloadItem,
    });
  }

  handleDownloadEvent(downloadDelta: OnChangedDownloadDeltaType) {
    // Отслеживает события загрузок и принимает решения на их основе
    logger.debug('An event occurred:', downloadDelta);

    this.eventOrchestrator({
      type: EventType.DownloadEvent,
      data: downloadDelta,
    });
  }

  handleDeterminingFilenameEvent(
    downloadItem: DownloadItem,
    suggest: Function,
  ) {
    // Функция "рекомендации" имени файла. Обязательно должна быть синхронной!
    // Возвращает true указывая, что рекомендация будет дана асинхронно.
    logger.debug('Request for defining file name:', downloadItem);

    if (downloadItem.byExtensionId !== browser.runtime.id) {
      suggest();
      return;
    }

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

  private async eventOrchestrator(event: EventMessage | undefined) {
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
    const targetFile = fileItems.length
      ? fileItems.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
      : null;

    if (!targetFile) {
      // Игнорируем загрузки, вызванные НЕ нашим расширением
      logger.warning(
        'The related file was not found in the storage.',
        event.data,
      );
      return;
    }

    // Мы должны заблокировать работу с данным объектом для других задач.
    // Все остальные задачи будут ожидать завершения текущей, после чего они
    // будут запущены в порядке очереди появления
    await this.resourceLockManager.lock({
      type: 'loadStorage',
      id: targetFile.relatedLoadItemId,
    });

    // Пока мы ждали завершения предыдущей задачи объект мог измениться
    const file = (await indexedDBObject.getFromIndex(
      'fileStorage',
      'file_id',
      targetFile.id,
    )) as FileItem;

    if (event.type === EventType.DownloadCreated) {
      const downloadItem: DownloadItem = event.data;

      await this.createDownload(file, downloadItem);
    } else if (event.type === EventType.DownloadEvent) {
      const downloadDelta: OnChangedDownloadDeltaType = event.data;

      if (downloadDelta.state?.current === 'complete') {
        await this.successDownload(file);
      } else if (downloadDelta.error?.current === 'USER_CANCELED') {
        await this.cancelDownload(file);
      } else if (downloadDelta.error?.current === 'FILE_NO_SPACE') {
        await this.cancelAllDownload(file);
      } else if (downloadDelta.error?.current) {
        logger.error('Download failed:', downloadDelta.error.current);
        await this.attemptNewDownload(file, LoadStatus.DownloadFailed);
      } else {
        // Деблокируем объект, иначе он навсегда останется заблокированным
        this.resourceLockManager.unlock({
          type: 'loadStorage',
          id: file.relatedLoadItemId,
        });
        logger.warning('Unknown download event:', downloadDelta);
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

  private async createDownload(fileItem: FileItem, downloadItem: DownloadItem) {
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
    this.resourceLockManager.unlock({
      type: 'loadStorage',
      id: fileItem.relatedLoadItemId,
    });
  }

  private async successDownload(fileItem: FileItem) {
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

      if (
        nextFileItem.status !== LoadStatus.StoppedByUser ||
        !loadIsCompleted(nextFileItem.status)
      ) {
        console.log('successDownload', nextFileItem.id, nextFileItem.status);
        nextFileItem.status = LoadStatus.InitiatingDownload;
      }

      await indexedDBObject.put('fileStorage', nextFileItem);
      await this.launchFileDownload(nextFileItem);
    } else {
      await this.queueController.successLoad(fileItem);
    }
    this.startNextDownload().then();
  }

  private async cancelDownload(fileItem: FileItem) {
    // Обработчик остановки активной загрузки
    logger.info('Attempt stopped loading:', fileItem);

    if (!loadIsCompleted(fileItem.status)) {
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
      this.resourceLockManager.unlock({
        type: 'loadStorage',
        id: fileItem.relatedLoadItemId,
      });
      logger.debug(
        'Attempt to stop loading interrupted - load is completed:',
        fileItem,
      );
    }
    this.startNextDownload().then();
  }

  private async pauseDownload(fileItem: FileItem) {
    // Обработчик паузы загрузки
    logger.debug('Download paused:', fileItem);

    fileItem.status = LoadStatus.DownloadPaused;
    await indexedDBObject.put('fileStorage', fileItem);
    await browser.downloads.pause(fileItem.downloadId!);
    this.resourceLockManager.unlock({
      type: 'loadStorage',
      id: fileItem.relatedLoadItemId,
    });
  }

  private async unpauseDownload(fileItem: FileItem) {
    // Обработчик возобновления загрузки после паузы
    logger.debug('Download resumed:', fileItem);

    fileItem.status = LoadStatus.Downloading;
    await indexedDBObject.put('fileStorage', fileItem);
    await browser.downloads.resume(fileItem.downloadId!);
    this.resourceLockManager.unlock({
      type: 'loadStorage',
      id: fileItem.relatedLoadItemId,
    });
  }

  private async cancelAllDownload(fileItem: FileItem) {
    logger.critical('The disk is not enough space for uploading a file!');
    const loadItem = (await indexedDBObject.getFromIndex(
      'loadStorage',
      'load_id',
      fileItem.relatedLoadItemId,
    )) as LoadItem;

    await this.breakDownloadWithError(fileItem, LoadStatus.DownloadFailed);
    await this.queueController.stopDownload(
      loadItem.movieId,
      LoadStatus.InitiationError,
    );
  }

  private async attemptNewDownload(fileItem: FileItem, cause: LoadStatus) {
    // Пытается повторить загрузку в случае неожиданного прерывания
    logger.warning('New load attempt:', fileItem);

    if (fileItem.status === LoadStatus.StoppedByUser) {
      logger.warning('New load attempt interrupted - StoppedByUser:', fileItem);
      this.resourceLockManager.unlock({
        type: 'loadStorage',
        id: fileItem.relatedLoadItemId,
      });
      this.startNextDownload().then();
      return;
    }

    if (fileItem.retryAttempts >= settings.maxFallbackAttempts) {
      logger.error(
        'New load attempt interrupted - Max attempts reached:',
        fileItem,
      );
      await this.breakDownloadWithError(fileItem, cause);
    } else {
      await this.repeatDownload(fileItem);
    }
  }

  private async breakDownloadWithError(fileItem: FileItem, cause: LoadStatus) {
    await this.queueController.failLoad(fileItem, cause);
    this.resourceLockManager.unlock({
      type: 'loadStorage',
      id: fileItem.relatedLoadItemId,
    });

    logger.error('Loading stopped with error:', cause, fileItem);
    this.startNextDownload().then();
  }

  private async repeatDownload(fileItem: FileItem) {
    logger.info('Start new load attempt:', fileItem);

    if (fileItem.downloadId) {
      // Удаляем старую загрузку из истории перед началом новой попытки
      await browser.downloads.erase({ id: fileItem.downloadId });
    }

    fileItem.retryAttempts++;
    fileItem.status = LoadStatus.InitiatingDownload;
    await indexedDBObject.put('fileStorage', fileItem);
    this.resourceLockManager.unlock({
      type: 'loadStorage',
      id: fileItem.relatedLoadItemId,
    });

    return new Promise((resolve) => {
      setTimeout(async () => {
        await this.resourceLockManager.lock({
          type: 'loadStorage',
          id: fileItem.relatedLoadItemId,
        });

        // Повторно получаем объект, ибо пока мы ждали доступа,
        // файл мог измениться
        const targetFile = (await indexedDBObject.getFromIndex(
          'fileStorage',
          'file_id',
          fileItem.id,
        )) as FileItem;
        const loadItem = (await indexedDBObject.getFromIndex(
          'loadStorage',
          'load_id',
          targetFile.relatedLoadItemId,
        )) as LoadItem;

        const siteLoader = this.siteLoaderFactory[loadItem.siteType];
        const siteLoadItem = await siteLoader.build(loadItem);

        targetFile.url =
          targetFile.fileType === 'video'
            ? await siteLoadItem.getVideoUrl()
            : await siteLoadItem.getSubtitlesUrl();
        await indexedDBObject.put('fileStorage', targetFile);

        resolve(await this.launchFileDownload(targetFile));
      }, settings.timeBetweenDownloadAttempts);
    });
  }
}
