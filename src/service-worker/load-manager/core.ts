import { Logger } from '@/lib/logger';
import { ResourceLockManager } from '@/lib/resource-lock-manager';
import { FileItem, Initiator, LoadItem, LoadStatus } from '@/lib/types';
import {
  findSomeFilesFromLoadItemIdsInDB,
  getTraceId,
  loadIsCompleted,
} from '@/lib/utils';
import { clearCache } from '@/service-worker/cache';
import {
  findBrokenFileItemInActiveDownloads,
  findBrokenLoadItemInActiveDownloads,
  isFirstRunExtension,
} from '@/service-worker/load-manager/inside-state-controller';
import siteLoaderFactory from '@/service-worker/site-loader/factory';
import type { Downloads } from 'webextension-polyfill';
import { QueueController } from './queue';

type OnChangedDownloadDeltaType = Downloads.OnChangedDownloadDeltaType;
type DownloadItem = Downloads.DownloadItem;
type DownloadOptionsType = Downloads.DownloadOptionsType;

type LoadManagerAsyncParams = {
  controller: QueueController;
};

export class DownloadManager {
  private resourceLockManager = new ResourceLockManager();
  private readonly queueController: QueueController;

  constructor({ async_param }: { async_param?: LoadManagerAsyncParams }) {
    if (typeof async_param === 'undefined') {
      throw new Error('Cannot be called directly');
    }

    this.queueController = async_param.controller;
  }

  static async build() {
    const async_param = await this.asyncConstructor();
    return new DownloadManager({ async_param });
  }

  private static async asyncConstructor(): Promise<LoadManagerAsyncParams> {
    return {
      controller: await QueueController.build(),
    };
  }

  async stabilizeInsideState({
    permissionToRestore,
    logger = globalThis.logger,
  }: {
    permissionToRestore?: boolean;
    logger?: Logger;
  }) {
    // При непредвиденном прерывании работы браузера (например отключение электричества),
    // может быть нарушена логика работы расширения, а данные потеряют актуальность.
    // Поэтому при старте браузера проводим аудит данных и в случае необходимости
    // восстанавливаем работоспособность расширения.

    if (typeof logger.metadata.traceId === 'undefined') {
      logger = logger.attachMetadata({ traceId: getTraceId() });
    }

    logger.info('Started checking inside state of load manager.');
    const isFirstRun = await isFirstRunExtension({ logger });

    if (isFirstRun) {
      await clearCache({ logger });
    }

    const brokenFileItems = await findBrokenFileItemInActiveDownloads({
      strictMode: isFirstRun || Boolean(permissionToRestore),
    });
    const brokenLoadItems = await findBrokenLoadItemInActiveDownloads();

    if (!brokenFileItems.length && !brokenLoadItems.length) {
      logger.info('Inside state is stable.');
      return;
    }

    logger.warning('Inside state is not stable. Need restoring data.');
    if (isFirstRun) {
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
            logger,
          });
          await this.repeatDownload({ fileItem, repeatNow: true, logger });
        }
        for (const loadItem of brokenLoadItems) {
          this.resourceLockManager
            .lock({
              type: 'loadStorage',
              id: loadItem.id,
              priority: 10,
              logger,
            })
            .then(async () => {
              loadItem.status = LoadStatus.DownloadCandidate;
              await indexedDBObject.put('loadStorage', loadItem);
              this.prepareDownload({
                nextLoadItemId: loadItem.id,
                logger,
              }).then();
            });
        }
      } else {
        await this.cancelAllDownload({ logger });
      }
    }
  }

  async initNewDownload({
    initiator,
    logger = globalThis.logger,
  }: {
    initiator: Initiator;
    logger?: Logger;
  }) {
    // Отвечает за добавление фильмов/сериалов в очередь на загрузку
    if (typeof logger.metadata.traceId === 'undefined') {
      logger = logger.attachMetadata({ traceId: getTraceId() });
    }

    logger.debug('Trigger new load:', initiator);
    await this.resourceLockManager.run({
      type: 'urlDetail',
      id: initiator.movieId,
      fn: this.queueController.initializeNewDownload.bind(
        this.queueController,
        { initiator, logger },
      ),
      priority: 100,
      logger,
    });
    this.startNextDownload({ logger }).then();
  }

  private async startNextDownload({
    logger = globalThis.logger,
  }: {
    logger?: Logger;
  }) {
    // Отвечает за определение объекта, на основе которого будет
    // производиться загрузка
    if (typeof logger.metadata.targetKey !== 'undefined') {
      logger = logger.attachMetadata({ targetKey: null });
    }
    logger.info('Attempt starting download.');

    const nextLoadItemId =
      await this.queueController.getNextObjectIdForDownload({ logger });

    if (!nextLoadItemId) {
      logger.info('Currently there are no available objects for loading.');
      return;
    }
    logger = logger.attachMetadata({ targetKey: nextLoadItemId });

    logger.debug('Next load item id:', nextLoadItemId);
    this.resourceLockManager
      .lock({ type: 'loadStorage', id: nextLoadItemId, priority: 10, logger })
      .then(() => this.prepareDownload({ nextLoadItemId, logger }));
    this.startNextDownload({ logger }).then();
  }

  private async prepareDownload({
    nextLoadItemId,
    logger = globalThis.logger,
  }: {
    nextLoadItemId: number;
    logger?: Logger;
  }) {
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
        logger,
      });
      return;
    }

    loadItem.status = LoadStatus.InitiatingDownload;
    await indexedDBObject.put('loadStorage', loadItem);

    const siteLoader = siteLoaderFactory[loadItem.siteType];
    const siteLoadItem = await siteLoader.build(loadItem);

    const [videoFile, subtitleFile] = await siteLoadItem.createAndGetFile({
      logger,
    });
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

    this.launchFileDownload({ fileItem: targetFile, logger }).then();
    this.startNextDownload({ logger }).then();
  }

  private async launchFileDownload({
    fileItem,
    logger = globalThis.logger,
  }: {
    fileItem: FileItem;
    logger?: Logger;
  }) {
    // Запускает загрузку конкретного файла
    logger.debug('Launching file download:', fileItem);

    if (fileItem.status !== LoadStatus.InitiatingDownload) {
      logger.error(
        'File download is interrupted - incorrect status:',
        fileItem.status,
      );
      await this.attemptNewDownload({
        fileItem,
        cause: LoadStatus.InitiationError,
        logger,
      });
      return;
    }

    // Если при запросе URL с сервера, произойдёт сбой, URL будет установлен как NULL
    if (fileItem.url === null) {
      logger.warning('File download failed - no url:', fileItem);
      await this.attemptNewDownload({
        fileItem,
        cause: LoadStatus.InitiationError,
        logger,
      });
      return;
    }

    const restoreHardLock = this.resourceLockManager.markAsSoftLock({
      type: 'loadStorage',
      id: fileItem.relatedLoadItemId,
      logger,
    });
    try {
      const startInitiationDownloadTime = new Date().getTime();

      const options: DownloadOptionsType = {
        url: fileItem.url,
        filename: fileItem.fileName,
        saveAs: fileItem.saveAs,
      };
      const downloadId = await this.callDownloadWithTimeout({
        options,
        logger,
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
            await this.cancelOneDownload({ fileItem: updatedFileItem, logger });
          }
        } else {
          fileItem.downloadId = downloadId;
          await indexedDBObject.put('fileStorage', fileItem);

          logger.info('File download started successfully:', fileItem);
          this.resourceLockManager.unlock({
            type: 'loadStorage',
            id: fileItem.relatedLoadItemId,
            logger,
          });
        }
      });
    } catch (e: any) {
      const error = e as Error;
      logger.error('Download start failed:', error.toString());
      await restoreHardLock().catch(() => {});
      await this.attemptNewDownload({
        fileItem,
        cause: LoadStatus.InitiationError,
        logger,
      });
    }
  }

  private async callDownloadWithTimeout({
    options,
    logger = globalThis.logger,
  }: {
    options: DownloadOptionsType;
    logger?: Logger;
  }): Promise<number> {
    let isTimeout = false;
    return new Promise(async (resolve, reject) => {
      browser.downloads
        .download(options)
        .then(async (downloadId) => {
          logger.info('Created downloadId:', downloadId);
          if (isTimeout) {
            logger.error('Download timeout:', downloadId);
            const downloadItem = await this.getActiveDownloadItemFromDownloadId(
              { downloadId, logger },
            );
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

  private async getActiveDownloadItemFromDownloadId({
    downloadId,
    logger = globalThis.logger,
  }: {
    downloadId: number;
    logger?: Logger;
  }) {
    let downloadItem: DownloadItem | undefined;
    do {
      downloadItem = (await browser.downloads.search({ id: downloadId }))[0];
      if (typeof downloadItem === 'undefined') return;
      // Если у фала есть filename - значит файл уже начал загрузку и
      // может быть удалён из списка загрузок, иначе, возникнет ошибка:
      // Unchecked runtime.lastError: Download must be in progress
    } while (!downloadItem.filename || downloadItem.state !== 'in_progress');

    logger.debug('Active download item:', downloadItem);
    return downloadItem;
  }

  private async findLastFileItemByDownloadId({
    downloadId,
    logger = globalThis.logger,
  }: {
    downloadId: number;
    logger?: Logger;
  }): Promise<FileItem | null> {
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
    if (fileItems.length > 1) {
      logger.info('Found multiple FileItems with the same downloadId.');
      return fileItems.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
    }
    return fileItems.length ? fileItems[0] : null;
  }

  async handleCreateEvent(downloadItem: DownloadItem) {
    // Обработчик успешной инициализации загрузки браузером
    let logger = globalThis.logger;
    if (downloadItem.state !== 'in_progress') {
      // Это сообщение о начале старой, уже законченной загрузки - игнорируем
      logger.debug('Ignore old download creation event:', downloadItem);
      return;
    }

    logger = logger.attachMetadata({
      traceId: getTraceId(),
    });

    logger.debug('Download has been created:', downloadItem);

    let targetFile = await this.findLastFileItemByDownloadId({
      downloadId: downloadItem.id,
      logger,
    });
    if (!targetFile) {
      // TODO: Если история загрузок будет в какой-то момент очищена,
      //  может получится так, что в БД уже будет id старой загрузки,
      //  в то время как новый id ещё не успел создаться

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

    logger = logger.attachMetadata({
      targetKey: targetFile.relatedLoadItemId,
    });

    await this.resourceLockManager.lock({
      type: 'loadStorage',
      id: targetFile.relatedLoadItemId,
      logger,
    });

    // Пока мы ждали завершения предыдущей задачи объект мог измениться
    const fileItem = (await indexedDBObject.getFromIndex(
      'fileStorage',
      'file_id',
      targetFile.id,
    )) as FileItem;

    await this.createDownload({ fileItem, downloadItem, logger });
  }

  async handleDownloadEvent(downloadDelta: OnChangedDownloadDeltaType) {
    // Отслеживает события загрузок и принимает решения на их основе
    let logger = globalThis.logger;
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

    logger = logger.attachMetadata({
      traceId: getTraceId(),
    });

    logger.debug('An event occurred:', downloadDelta);

    let targetFile = await this.findLastFileItemByDownloadId({
      downloadId: downloadDelta.id,
      logger,
    });
    if (!targetFile) {
      // Игнорируем загрузки, вызванные НЕ нашим расширением
      logger.warning(
        `The related file (${downloadDelta.id}) was not found in the storage.`,
      );
      return;
    }

    logger = logger.attachMetadata({
      targetKey: targetFile.relatedLoadItemId,
    });

    await this.resourceLockManager.lock({
      type: 'loadStorage',
      id: targetFile.relatedLoadItemId,
      logger,
    });

    // Пока мы ждали завершения предыдущей задачи объект мог измениться
    targetFile = (await indexedDBObject.getFromIndex(
      'fileStorage',
      'file_id',
      targetFile.id,
    )) as FileItem;

    if (downloadDelta.paused?.current === true) {
      await this.pauseDownload({ fileItem: targetFile, logger });
    } else if (downloadDelta.paused?.current === false) {
      await this.unpauseDownload({ fileItem: targetFile, logger });
    }

    if (downloadDelta.state?.current === 'complete') {
      await this.successDownload({ fileItem: targetFile, logger });
    } else if (downloadDelta.error?.current) {
      if (downloadDelta.error?.current === 'USER_CANCELED') {
        await this.cancelOneDownload({ fileItem: targetFile, logger });
      } else if (downloadDelta.error?.current === 'FILE_NO_SPACE') {
        logger.critical('The disk is not enough space for uploading a file!');
        await this.cancelAllDownloadsOneMovie({ fileItem: targetFile, logger });
      } else {
        logger.error('Download failed:', downloadDelta.error.current);
        await this.attemptNewDownload({
          fileItem: targetFile,
          cause: LoadStatus.DownloadFailed,
          logger,
        });
      }
    } else {
      // Деблокируем объект, иначе он навсегда останется заблокированным
      if (!downloadDelta.filename?.current) {
        logger.warning('Unknown download event:', downloadDelta);
      }
      this.resourceLockManager.unlock({
        type: 'loadStorage',
        id: targetFile.relatedLoadItemId,
        logger,
      });
    }
  }

  handleDeterminingFilenameEvent(
    downloadItem: DownloadItem,
    suggest: Function,
  ) {
    // Функция "рекомендации" имени файла. Обязательно должна быть синхронной!
    // Возвращает true указывая, что рекомендация будет дана асинхронно.
    let logger = globalThis.logger.attachMetadata({
      traceId: getTraceId(),
    });
    logger.debug('Request for defining file name:', downloadItem);

    if (
      downloadItem.byExtensionId !== browser.runtime.id ||
      !settings.trackEventsOnDeterminingFilename
    ) {
      logger.info('Ignore event from other source.');
      return suggest();
    }

    // handleDeterminingFilenameEvent может быть вызван до того, как данные
    // сохранятся в БД, поэтому мы ждём следующего фрейма, чтобы данные в БД
    // успели точно обновиться
    new Promise((resolve) => setTimeout(resolve, 0)).then(async () => {
      downloadItem.id;
      const targetFileItem = await this.findLastFileItemByDownloadId({
        downloadId: downloadItem.id,
        logger,
      });

      if (!targetFileItem) {
        logger.warning(
          'Not found target fileItem for this downloadItem:',
          downloadItem,
        );
        return suggest();
      }

      logger = logger.attachMetadata({
        targetKey: targetFileItem.relatedLoadItemId,
      });

      logger.debug('Suggested filename:', targetFileItem.fileName);
      return suggest({
        conflictAction: 'uniquify',
        filename: targetFileItem.fileName,
      });
    });

    return true;
  }

  private async createDownload({
    fileItem,
    downloadItem,
    logger = globalThis.logger,
  }: {
    fileItem: FileItem;
    downloadItem: DownloadItem;
    logger?: Logger;
  }) {
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
      logger,
    });
  }

  private async successDownload({
    fileItem,
    logger = globalThis.logger,
  }: {
    fileItem: FileItem;
    logger?: Logger;
  }) {
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
      await this.launchFileDownload({ fileItem: nextFileItem, logger });
    } else {
      await this.queueController.successLoad({ fileItem, logger });

      this.resourceLockManager.unlock({
        type: 'loadStorage',
        id: fileItem.relatedLoadItemId,
        logger,
      });
    }
    this.startNextDownload({ logger }).then();
  }

  private async cancelAllDownload({
    logger = globalThis.logger,
  }: {
    logger?: Logger;
  }) {
    const groupToRemove = [
      ...this.queueController.activeDownloadsList,
      ...this.queueController.queueList.flat(2),
    ];
    await this.queueController.removeDownloadsFromQueue({
      groupToRemove,
      logger,
    });
  }

  private async cancelAllDownloadsOneMovie({
    fileItem,
    logger = globalThis.logger,
  }: {
    fileItem: FileItem;
    logger?: Logger;
  }) {
    const loadItem = (await indexedDBObject.getFromIndex(
      'loadStorage',
      'load_id',
      fileItem.relatedLoadItemId,
    )) as LoadItem;

    await this.breakDownloadWithError({
      fileItem,
      cause: LoadStatus.DownloadFailed,
      logger,
    });
    await this.queueController.stopDownload({
      movieId: loadItem.movieId,
      cause: LoadStatus.InitiationError,
      logger,
    });
  }

  private async cancelOneDownload({
    fileItem,
    logger = globalThis.logger,
  }: {
    fileItem: FileItem;
    logger?: Logger;
  }) {
    // Обработчик остановки активной загрузки
    logger.info('Attempt stopped loading:', fileItem);

    if (fileItem.downloadId) {
      const downloadItem = await this.getActiveDownloadItemFromDownloadId({
        downloadId: fileItem.downloadId,
        logger,
      });
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

      await this.breakDownloadWithError({
        fileItem,
        cause: LoadStatus.StoppedByUser,
        logger,
      });
    } else if (!loadIsCompleted(fileItem.status)) {
      await this.breakDownloadWithError({
        fileItem,
        cause: LoadStatus.StoppedByUser,
        logger,
      });
    } else {
      this.resourceLockManager.unlock({
        type: 'loadStorage',
        id: fileItem.relatedLoadItemId,
        logger,
      });
      logger.debug(
        'Attempt to stop loading interrupted - load is completed:',
        fileItem,
      );
    }
    this.startNextDownload({ logger }).then();
  }

  private async pauseDownload({
    fileItem,
    logger = globalThis.logger,
  }: {
    fileItem: FileItem;
    logger?: Logger;
  }) {
    // Обработчик паузы загрузки
    logger.debug('Download paused:', fileItem);

    fileItem.status = LoadStatus.DownloadPaused;
    await indexedDBObject.put('fileStorage', fileItem);
    await browser.downloads.pause(fileItem.downloadId!);
  }

  private async unpauseDownload({
    fileItem,
    logger = globalThis.logger,
  }: {
    fileItem: FileItem;
    logger?: Logger;
  }) {
    // Обработчик возобновления загрузки после паузы
    logger.debug('Download resumed:', fileItem);

    fileItem.status = LoadStatus.Downloading;
    await indexedDBObject.put('fileStorage', fileItem);
    await browser.downloads.resume(fileItem.downloadId!);
  }

  private async attemptNewDownload({
    fileItem,
    cause,
    logger = globalThis.logger,
  }: {
    fileItem: FileItem;
    cause: LoadStatus;
    logger?: Logger;
  }) {
    // Пытается повторить загрузку в случае неожиданного прерывания
    logger.warning('New load attempt:', fileItem);

    if (fileItem.status === LoadStatus.StoppedByUser) {
      logger.warning('New load attempt interrupted - StoppedByUser:', fileItem);

      this.resourceLockManager.unlock({
        type: 'loadStorage',
        id: fileItem.relatedLoadItemId,
        logger,
      });
      this.startNextDownload({ logger }).then();
    } else if (fileItem.retryAttempts >= settings.maxFallbackAttempts) {
      logger.error(
        'New load attempt interrupted - Max attempts reached:',
        fileItem,
      );

      await this.breakDownloadWithError({ fileItem, cause, logger });
    } else {
      await this.repeatDownload({ fileItem, logger });
    }
  }

  private async breakDownloadWithError({
    fileItem,
    cause,
    logger = globalThis.logger,
  }: {
    fileItem: FileItem;
    cause: LoadStatus;
    logger?: Logger;
  }) {
    await this.queueController.failLoad({ fileItem, cause, logger });
    this.resourceLockManager.unlock({
      type: 'loadStorage',
      id: fileItem.relatedLoadItemId,
      logger,
    });

    logger.error('Loading stopped with error:', cause, fileItem);
    this.startNextDownload({ logger }).then();
  }

  private async repeatDownload({
    fileItem,
    repeatNow = false,
    logger = globalThis.logger,
  }: {
    fileItem: FileItem;
    repeatNow?: boolean;
    logger?: Logger;
  }) {
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
        this.executeRetry.bind(this, {
          loadItemId: fileItem.relatedLoadItemId,
          targetFileId: fileItem.id,
          logger,
        }),
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
      logger,
    });
  }

  public async executeRetry({
    loadItemId,
    targetFileId,
    logger = globalThis.logger,
  }: {
    loadItemId: number;
    targetFileId: number;
    logger?: Logger;
  }) {
    if (typeof logger.metadata.traceId === 'undefined') {
      logger = logger.attachMetadata({ traceId: getTraceId() });
    }
    logger.attachMetadata({ targetKey: loadItemId });
    await this.resourceLockManager.lock({
      type: 'loadStorage',
      id: loadItemId,
      logger,
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

    const siteLoader = siteLoaderFactory[loadItem.siteType];
    const siteLoadItem = await siteLoader.build(loadItem);

    targetFile.url =
      targetFile.fileType === 'video'
        ? await siteLoadItem.getVideoUrl({ logger })
        : await siteLoadItem.getSubtitlesUrl({ logger });
    targetFile.status = LoadStatus.InitiatingDownload;

    await indexedDBObject.put('fileStorage', targetFile);

    return await this.launchFileDownload({ fileItem: targetFile, logger });
  }
}
