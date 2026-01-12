import {
  findBrokenFileItemInActiveDownloads,
  findBrokenLoadItemInActiveDownloads,
  isFirstRunExtension,
} from '@/lib/inside-state-controller';
import { ResourceLockManager } from '@/lib/resource-lock-manager';
import { FileItem, Initiator, LoadItem, LoadStatus } from '@/lib/types';
import { findSomeFilesFromLoadItemIdsInDB, loadIsCompleted } from '@/lib/utils';
import { clearCache } from '@/service-worker/cache';
import type { Downloads } from 'webextension-polyfill';
import { QueueController } from './queue';
import { HDrezkaLoader, SiteLoader } from './site-loader';

type OnChangedDownloadDeltaType = Downloads.OnChangedDownloadDeltaType;
type DownloadItem = Downloads.DownloadItem;
type DownloadOptionsType = Downloads.DownloadOptionsType;

type LoadManagerAsyncParams = {
  controller: QueueController;
};

export class DownloadManager {
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

  async stabilizeInsideState(permissionToRestore?: boolean) {
    // При непредвиденном прерывании работы браузера (например отключение электричества),
    // может быть нарушена логика работы расширения, а данные потеряют актуальность.
    // Поэтому при старте браузера проводим аудит данных и в случае необходимости
    // восстанавливаем работоспособность расширения.

    logger.info('Started checking inside state of load manager.');
    const isFirstRun = await isFirstRunExtension();

    const brokenFileItems = await findBrokenFileItemInActiveDownloads(
      isFirstRun || Boolean(permissionToRestore),
    );
    const brokenLoadItems = await findBrokenLoadItemInActiveDownloads();

    if (isFirstRun) {
      await clearCache();

      if (!brokenFileItems.length && !brokenLoadItems.length) return;
      await browser.storage.session.set({ needToRestoreInsideState: true });
    }

    if (typeof permissionToRestore !== 'undefined') {
      await browser.storage.session.set({ needToRestoreInsideState: false });

      logger.info(
        `Restore inside state permission: ${permissionToRestore ? 'granted' : 'denied'}`,
      );
      if (permissionToRestore) {
        for (const fileItem of brokenFileItems) {
          await this.resourceLockManager.lock({
            type: 'loadStorage',
            id: fileItem.relatedLoadItemId,
          });
          await this.repeatDownload(fileItem, true);
        }
        for (const loadItem of brokenLoadItems) {
          const target = { type: 'loadStorage', id: loadItem.id };
          this.resourceLockManager.lock(target, 10).then(async () => {
            loadItem.status = LoadStatus.DownloadCandidate;
            await indexedDBObject.put('loadStorage', loadItem);
            this.prepareDownload(loadItem.id).then();
          });
        }
      } else {
        await this.cancelAllDownload();
      }
    }
  }

  async initNewDownload(initiator: Initiator) {
    // Отвечает за добавление фильмов/сериалов в очередь на загрузку
    logger.debug('Trigger new load:', initiator);

    await this.queueController.initializeNewDownload(initiator);
    this.startNextDownload().then();
  }

  private async startNextDownload() {
    // Отвечает за определение объекта, на основе которого будет
    // производиться загрузка
    logger.info('Attempt starting download.');

    const nextLoadItemId =
      await this.queueController.getNextObjectIdForDownload();

    if (!nextLoadItemId) {
      logger.info('Currently there are no available objects for loading.');
      return;
    }

    logger.debug('Next load item id:', nextLoadItemId);
    const targetResource = { type: 'loadStorage', id: nextLoadItemId };
    this.resourceLockManager
      .lock(targetResource, 10)
      .then(() => this.prepareDownload(nextLoadItemId));
    this.startNextDownload().then();
  }

  private async prepareDownload(nextLoadItemId: number) {
    // Подготавливает объект перед загрузкой
    const loadItem = (await indexedDBObject.getFromIndex(
      'loadStorage',
      'load_id',
      nextLoadItemId,
    )) as LoadItem;

    if (loadItem.status !== LoadStatus.DownloadCandidate) {
      logger.warning('The start of the load initialization is interrupted.');
      this.resourceLockManager.unlock({
        type: 'loadStorage',
        id: loadItem.id,
      });
      return;
    }

    loadItem.status = LoadStatus.InitiatingDownload;
    await indexedDBObject.put('loadStorage', loadItem);

    const siteLoader = this.siteLoaderFactory[loadItem.siteType];
    const siteLoadItem = await siteLoader.build(loadItem);

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
      logger.error(
        'File download is interrupted - incorrect status:',
        fileItem.status,
      );
      await this.attemptNewDownload(fileItem, LoadStatus.InitiationError);
      return;
    }

    // Если при запросе URL с сервера, произойдёт сбой, URL будет установлен как NULL
    if (fileItem.url === null) {
      logger.warning('File download failed - no url:', fileItem);
      await this.attemptNewDownload(fileItem, LoadStatus.InitiationError);
      return;
    }

    const restoreHardLock = this.resourceLockManager.markAsSoftLock({
      type: 'loadStorage',
      id: fileItem.relatedLoadItemId,
    });
    try {
      const startInitiationDownloadTime = new Date().getTime();

      const downloadId = await this.callDownloadWithTimeout({
        url: fileItem.url,
        filename: fileItem.fileName,
        saveAs: fileItem.saveAs,
      });

      const totalInitiationDownloadTime =
        new Date().getTime() - startInitiationDownloadTime;

      logger.info(
        `File item ${fileItem.id} took ${totalInitiationDownloadTime / 1_000}s to start loading.`,
      );

      restoreHardLock().then(async (wasInterrupted) => {
        if (wasInterrupted) {
          logger.warning('File download start interrupted:', fileItem);
          const updatedFileItem = (await indexedDBObject.getFromIndex(
            'fileStorage',
            'file_id',
            fileItem.id,
          )) as FileItem;
          updatedFileItem.downloadId = downloadId;
          await indexedDBObject.put('fileStorage', updatedFileItem);

          if (loadIsCompleted(updatedFileItem.status)) {
            await this.cancelOneDownload(updatedFileItem);
          }
        } else {
          fileItem.downloadId = downloadId;
          await indexedDBObject.put('fileStorage', fileItem);

          logger.info('File download started successfully:', fileItem);
          this.resourceLockManager.unlock({
            type: 'loadStorage',
            id: fileItem.relatedLoadItemId,
          });
        }
      });
    } catch (e: any) {
      const error = e as Error;
      logger.error('Download start failed:', error.toString());
      await restoreHardLock().catch(() => {});
      await this.attemptNewDownload(fileItem, LoadStatus.InitiationError);
    }
  }

  private async callDownloadWithTimeout(
    options: DownloadOptionsType,
  ): Promise<number> {
    let isTimeout = false;
    return new Promise(async (resolve, reject) => {
      browser.downloads
        .download(options)
        .then(async (downloadId) => {
          logger.info('Created downloadId:', downloadId);
          if (isTimeout) {
            logger.error('Download timeout:', downloadId);
            const downloadItem =
              await this.getActiveDownloadItemFromDownloadId(downloadId);
            if (downloadItem?.state === 'in_progress') {
              await browser.downloads.cancel(downloadId);
              await browser.downloads.erase({ id: downloadId });
            }
          } else {
            resolve(downloadId);
          }
        })
        .catch(async (error) => {
          reject(error);
        });
      setTimeout(async () => {
        isTimeout = true;
        reject(new Error('Download timeout'));
      }, settings.downloadStartTimeLimit);
    });
  }

  private async getActiveDownloadItemFromDownloadId(downloadId: number) {
    let downloadItem: DownloadItem | undefined;
    do {
      downloadItem = (await browser.downloads.search({ id: downloadId }))[0];
      if (typeof downloadItem === 'undefined') return;
      // Если у фала есть filename - значит файл уже начал загрузку и
      // может быть удалён из списка загрузок, иначе, возникнет ошибка:
      // Unchecked runtime.lastError: Download must be in progress
    } while (!downloadItem.filename || downloadItem.state !== 'in_progress');
    return downloadItem;
  }

  private async findLastFileItemByDownloadId(
    downloadId: number,
  ): Promise<FileItem | null> {
    const fileItems = (await indexedDBObject.getAllFromIndex(
      'fileStorage',
      'download_id',
      downloadId,
    )) as FileItem[];

    // Если пользователь очистит историю загрузок в браузере,
    // то браузер начнёт создавать новые загрузки с id от 1.
    // Что потенциально может создать ситуацию, когда у нас
    // в базе будет лежать несколько FileItem с одинаковым downloadId.
    // В таком случае нас интересует только последний созданный FileItem.
    return fileItems.length
      ? fileItems.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
      : null;
  }

  async handleCreateEvent(downloadItem: DownloadItem) {
    // Обработчик успешной инициализации загрузки браузером
    if (downloadItem.state !== 'in_progress') {
      // Это сообщение о начале старой, уже законченной загрузки - игнорируем
      logger.debug('Ignore old download creation event:', downloadItem);
      return;
    }
    logger.debug('Download has been created:', downloadItem);

    let targetFile = await this.findLastFileItemByDownloadId(downloadItem.id);
    if (!targetFile) {
      // Есть вероятность, что событие пришло раньше, чем был установлен
      // downloadId, и, следовательно, targetFile будет равен null, однако,
      // если загрузка была инициирована нашим расширением, мы можем попытаться
      // найти загрузку, сравнив URL, у downloadItem и файлов активных загрузок
      const fileItemsList = await findSomeFilesFromLoadItemIdsInDB(
        this.queueController.activeDownloadsList,
      );

      targetFile =
        fileItemsList.find(
          (fileItem) =>
            fileItem.downloadId === downloadItem.id ||
            fileItem.url === downloadItem.url,
        ) ?? null;
    }

    if (!targetFile) {
      // Если нам не удалось найти целевой FileItem - игнорируем событие
      logger.warning(
        `The related file (${downloadItem.id}) was not found in the storage.`,
      );
      return;
    }

    await this.resourceLockManager.lock({
      type: 'loadStorage',
      id: targetFile.relatedLoadItemId,
    });

    // Пока мы ждали завершения предыдущей задачи объект мог измениться
    targetFile = (await indexedDBObject.getFromIndex(
      'fileStorage',
      'file_id',
      targetFile.id,
    )) as FileItem;

    await this.createDownload(targetFile, downloadItem);
  }

  async handleDownloadEvent(downloadDelta: OnChangedDownloadDeltaType) {
    // Отслеживает события загрузок и принимает решения на их основе
    if (
      ![
        downloadDelta.paused,
        downloadDelta.state,
        downloadDelta.error,
        downloadDelta.filename,
      ].some(Boolean)
    ) {
      // Игнорируем не отслеживаемые события
      logger.debug('Ignore unknown download event for:', downloadDelta);
      return;
    }
    logger.debug('An event occurred:', downloadDelta);

    let targetFile = await this.findLastFileItemByDownloadId(downloadDelta.id);
    if (!targetFile) {
      // Игнорируем загрузки, вызванные НЕ нашим расширением
      logger.warning(
        `The related file (${downloadDelta.id}) was not found in the storage.`,
      );
      return;
    }

    await this.resourceLockManager.lock({
      type: 'loadStorage',
      id: targetFile.relatedLoadItemId,
    });

    // Пока мы ждали завершения предыдущей задачи объект мог измениться
    targetFile = (await indexedDBObject.getFromIndex(
      'fileStorage',
      'file_id',
      targetFile.id,
    )) as FileItem;

    if (downloadDelta.paused?.current === true) {
      await this.pauseDownload(targetFile);
    } else if (downloadDelta.paused?.current === false) {
      await this.unpauseDownload(targetFile);
    }

    if (downloadDelta.state?.current === 'complete') {
      await this.successDownload(targetFile);
    } else if (downloadDelta.error?.current) {
      if (downloadDelta.error?.current === 'USER_CANCELED') {
        await this.cancelOneDownload(targetFile);
      } else if (downloadDelta.error?.current === 'FILE_NO_SPACE') {
        logger.critical('The disk is not enough space for uploading a file!');
        await this.cancelAllDownloadsOneMovie(targetFile);
      } else {
        logger.error('Download failed:', downloadDelta.error.current);
        await this.attemptNewDownload(targetFile, LoadStatus.DownloadFailed);
      }
    } else {
      // Деблокируем объект, иначе он навсегда останется заблокированным
      if (!downloadDelta.filename?.current) {
        logger.warning('Unknown download event:', downloadDelta);
      }
      this.resourceLockManager.unlock({
        type: 'loadStorage',
        id: targetFile.relatedLoadItemId,
      });
    }
  }

  handleDeterminingFilenameEvent(
    downloadItem: DownloadItem,
    suggest: Function,
  ) {
    // Функция "рекомендации" имени файла. Обязательно должна быть синхронной!
    // Возвращает true указывая, что рекомендация будет дана асинхронно.
    logger.debug('Request for defining file name:', downloadItem);

    if (
      downloadItem.byExtensionId !== browser.runtime.id ||
      !settings.trackEventsOnDeterminingFilename
    ) {
      return suggest();
    }

    this.findFilenameByDownloadId(downloadItem.id).then((suggestFileName) => {
      suggest(
        suggestFileName
          ? { conflictAction: 'uniquify', filename: suggestFileName }
          : undefined,
      );
    });

    return true;
  }

  private async findFilenameByDownloadId(
    downloadId: number,
  ): Promise<string | undefined> {
    // handleDeterminingFilenameEvent может быть вызван до того, как данные
    // сохранятся в БД, поэтому мы ждём следующего фрейма, чтобы данные в БД
    // успели точно обновиться
    await new Promise((res) => setTimeout(res, 0));
    const fileItemsList = (await indexedDBObject.getAllFromIndex(
      'fileStorage',
      'download_id',
      downloadId,
    )) as FileItem[];

    const targetFileItem = fileItemsList.length
      ? fileItemsList.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
      : null;
    return targetFileItem?.fileName;
  }

  private async createDownload(fileItem: FileItem, downloadItem: DownloadItem) {
    if (fileItem.status === LoadStatus.StoppedByUser) {
      // Иногда старт загрузки задерживается, в то время как она уже была
      // отменена. В этом случае необходимо отменить загрузку при старте
      await browser.downloads.cancel(downloadItem.id);
      await browser.downloads.erase({ id: downloadItem.id });

      logger.warning('Download created interrupted - StoppedByUser:', fileItem);
    } else {
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

      if (nextFileItem.status !== LoadStatus.DownloadCandidate) {
        nextFileItem.status = LoadStatus.InitiatingDownload;
      }

      await indexedDBObject.put('fileStorage', nextFileItem);
      await this.launchFileDownload(nextFileItem);
    } else {
      await this.queueController.successLoad(fileItem);

      this.resourceLockManager.unlock({
        type: 'loadStorage',
        id: fileItem.relatedLoadItemId,
      });
    }
    this.startNextDownload().then();
  }

  private async cancelAllDownload() {
    const listToRemove = [
      ...this.queueController.activeDownloadsList,
      ...this.queueController.queueList.flat(2),
    ];
    await this.queueController.removeDownloadsFromQueue(listToRemove);
  }

  private async cancelAllDownloadsOneMovie(fileItem: FileItem) {
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

  private async cancelOneDownload(fileItem: FileItem) {
    // Обработчик остановки активной загрузки
    logger.info('Attempt stopped loading:', fileItem);

    if (fileItem.downloadId) {
      const downloadItem = await this.getActiveDownloadItemFromDownloadId(
        fileItem.downloadId,
      );
      if (downloadItem?.state === 'in_progress') {
        await browser.downloads.cancel(fileItem.downloadId);
      }

      if (downloadItem?.filename) {
        const extractFilename = (filename: string) =>
          filename
            .split(/[\\/]/)
            .at(-1)!
            .match(/(.*)\.\w+/)![1];

        const extractedRealFilename = extractFilename(downloadItem.filename);
        const extractedPrimaryFilename = extractFilename(fileItem.fileName);
        if (!extractedRealFilename.startsWith(extractedPrimaryFilename)) {
          // Если расширение не успело установить своё имя для файла, но уже начало
          // загрузку - удаляем файл, чтоб не путать пользователя
          await browser.downloads.erase({ id: fileItem.id });
        }
      }

      await this.breakDownloadWithError(fileItem, LoadStatus.StoppedByUser);
    } else if (!loadIsCompleted(fileItem.status)) {
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
  }

  private async unpauseDownload(fileItem: FileItem) {
    // Обработчик возобновления загрузки после паузы
    logger.debug('Download resumed:', fileItem);

    fileItem.status = LoadStatus.Downloading;
    await indexedDBObject.put('fileStorage', fileItem);
    await browser.downloads.resume(fileItem.downloadId!);
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
    } else if (fileItem.retryAttempts >= settings.maxFallbackAttempts) {
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

  private async repeatDownload(fileItem: FileItem, repeatNow: boolean = false) {
    logger.info('Start new load attempt:', fileItem);

    const oldDownloadId = fileItem.downloadId;

    fileItem.retryAttempts++;
    fileItem.status = LoadStatus.DownloadFailed;

    // Мы должны удалить старую связь с объектом загрузки браузера,
    // ибо, когда загрузка будет удалена из истории: браузер вызовет
    // событие USER_CANCELED. Из-за чего файлы будут удалены из активных
    // загрузок и расширение не сможет корректно отслеживать загрузки.
    fileItem.downloadId = null;

    // Сохраняем fileItem в хранилище ПЕРЕД вызовом downloads.erase, чтоб
    // downloadId успел обновиться до того, как придёт событие USER_CANCELED
    await indexedDBObject.put('fileStorage', fileItem);

    if (oldDownloadId) {
      // Удаляем старую загрузку из истории перед началом новой попытки
      // для того, чтоб в истории загрузок не было видно неудачных попыток,
      // так для пользователя работа расширения будет выглядеть стабильнее
      await browser.downloads.erase({ id: oldDownloadId });
    }

    if (repeatNow) {
      // Даём небольшую задержку, чтобы при старте браузер успел инициализироваться
      setTimeout(
        this.executeRetry.bind(this, fileItem.relatedLoadItemId, fileItem.id),
        5000,
      );
    } else {
      const repeatKey = `repeat-download-${fileItem.relatedLoadItemId}-${fileItem.id}`;
      const when = Date.now() + settings.timeBetweenDownloadAttempts;
      browser.alarms.create(repeatKey, { when });
    }

    this.resourceLockManager.unlock({
      type: 'loadStorage',
      id: fileItem.relatedLoadItemId,
    });
  }

  public async executeRetry(loadItemId: number, targetFileId: number) {
    await this.resourceLockManager.lock({
      type: 'loadStorage',
      id: loadItemId,
    });

    const loadItem = (await indexedDBObject.getFromIndex(
      'loadStorage',
      'load_id',
      loadItemId,
    )) as LoadItem;

    const targetFile = (await indexedDBObject.getFromIndex(
      'fileStorage',
      'file_id',
      targetFileId,
    )) as FileItem;

    const siteLoader = this.siteLoaderFactory[loadItem.siteType];
    const siteLoadItem = await siteLoader.build(loadItem);

    targetFile.url =
      targetFile.fileType === 'video'
        ? await siteLoadItem.getVideoUrl()
        : await siteLoadItem.getSubtitlesUrl();
    targetFile.status = LoadStatus.InitiatingDownload;

    await indexedDBObject.put('fileStorage', targetFile);

    return await this.launchFileDownload(targetFile);
  }
}
