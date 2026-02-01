import { extractFilename } from '@/lib/filename-maker';
import { attachTraceId, getTraceId, Logger } from '@/lib/logger';
import { ResourceLockManager } from '@/lib/resource-lock-manager';
import { FileItem, Initiator, LoadItem, LoadStatus } from '@/lib/types';
import { loadIsCompleted } from '@/lib/utils';
import {
  findBrokenFileItemInActiveDownloads,
  findBrokenLoadItemInActiveDownloads,
  findSomeFilesFromLoadItemIdsInDB,
  isFirstRunExtension,
} from '@/service-worker/load-manager/inside-state-controller';
import { clearCache } from '@/service-worker/network-layer/cache';
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

  @attachTraceId()
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
    logger.info('Started checking inside state of load manager.');

    const isFirstRun = await isFirstRunExtension({ logger });
    if (isFirstRun) {
      await clearCache({ logger });
    }

    const brokenFileItems = await findBrokenFileItemInActiveDownloads({
      strictMode: isFirstRun || Boolean(permissionToRestore),
      logger,
    });
    const brokenLoadItems = await findBrokenLoadItemInActiveDownloads({
      logger,
    });

    if (!brokenFileItems.length && !brokenLoadItems.length) {
      logger.debug('Inside state is stable.');
      return;
    }

    logger.warning('Inside state is not stable. Need restoring data.');
    if (isFirstRun) {
      logger.debug('Requesting restore inside state permission.');
      await browser.storage.session.set({ needToRestoreInsideState: true });
    }

    if (typeof permissionToRestore !== 'undefined') {
      await browser.storage.session.set({ needToRestoreInsideState: false });

      if (permissionToRestore) {
        logger.debug('Restoring inside state.');
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
        logger.debug('Restore inside state permission was denied.');
        await this.cancelAllDownload({ logger });
      }
    }
  }

  @attachTraceId()
  async initNewDownload({
    initiator,
    logger = globalThis.logger,
  }: {
    initiator: Initiator;
    logger?: Logger;
  }) {
    // Точка входа для добавления фильмов/сериалов в очередь на загрузку
    // или отмены их загрузки
    logger.info('Trigger new load:', initiator);

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
    // производиться загрузка, и запуске его в обработку
    if (typeof logger.metadata.targetKey !== 'undefined') {
      logger = logger.attachMetadata({ targetKey: null });
    }
    logger.info('Attempt starting download.');

    const nextLoadItemId =
      await this.queueController.getNextObjectIdForDownload({ logger });

    if (!nextLoadItemId) {
      logger.debug('Currently there are no available objects for loading.');
      return;
    }
    logger = logger.attachMetadata({ targetKey: nextLoadItemId });

    logger.info('Next load item id:', nextLoadItemId);
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
    // Проводит подготовку объекта перед загрузкой, и инициирует загрузку
    logger.info('Prepare download:', nextLoadItemId);

    const loadItem = (await indexedDBObject.getFromIndex(
      'loadStorage',
      'load_id',
      nextLoadItemId,
    )) as LoadItem;

    if (loadItem.status !== LoadStatus.DownloadCandidate) {
      // TODO: Тут может возникнуть ошибка когда файл продолжит висеть в очереди
      logger.critical(
        'The start of the load initialization is interrupted - incorrect status:',
        loadItem,
      );
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
    logger.info('Launching file download:', fileItem);

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
      logger.error('File download failed - no url:', fileItem);
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

          if (!loadIsCompleted(updatedFileItem.status)) {
            logger.debug('Canceling download:', downloadId);
            await this.cancelOneDownload({ fileItem: updatedFileItem, logger });
          } else {
            logger.debug(
              'The file has already finished downloading',
              updatedFileItem,
            );
            this.resourceLockManager.unlock({
              type: 'loadStorage',
              id: fileItem.relatedLoadItemId,
              logger,
            });
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
      logger.error('Download start failed:', error);
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
    // Обёртка вокруг download API браузера, обеспечивающая возможность
    // прерывания по timeout, если загрузка долго не стартует
    logger.info('Calling download with timeout:', options);

    let isTimeout = false;
    return new Promise(async (resolve, reject) => {
      browser.downloads
        .download(options)
        .then(async (downloadId) => {
          logger.debug('Created downloadId:', downloadId);
          if (isTimeout) {
            logger.error('Download timeout:', downloadId);
            const downloadItem = await this.getActiveDownloadItemFromDownloadId(
              { downloadId, logger },
            );
            if (downloadItem?.state === 'in_progress') {
              logger.warning('Download was canceled by timeout:', downloadId);
              await browser.downloads.cancel(downloadId);
              await browser.downloads.erase({ id: downloadId });
            }
          } else {
            resolve(downloadId);
          }
        })
        .catch(async (error) => {
          logger.error('Download failed:', error);
          reject(error);
        });

      setTimeout(async () => {
        isTimeout = true;
        reject(new Error('Download timeout.'));
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
    // Возвращает полностью инициализированный объект DownloadItem
    // пригодный для отмены/удаления, в противном случае дожидается
    // его полной инициализации
    logger.info(
      'Getting active DownloadItem item from downloadId:',
      downloadId,
    );

    let downloadItem: DownloadItem | undefined;
    do {
      downloadItem = (await browser.downloads.search({ id: downloadId }))[0];
      if (typeof downloadItem === 'undefined') return;

      // Продолжаем цикл, пока НЕТ filename И файл ещё в процессе загрузки
    } while (!downloadItem.filename && downloadItem.state === 'in_progress');

    logger.debug('Active download item:', downloadItem);
    return downloadItem;
  }

  private async findLastFileItemByDownloadId({
    downloadItem,
    logger = globalThis.logger,
  }: {
    downloadItem: DownloadItem | undefined;
    logger?: Logger;
  }): Promise<FileItem | null> {
    // Ищет последний созданный FileItem, с желаемым downloadId
    if (!downloadItem) {
      logger.debug('DownloadItem is empty.');
      return null;
    }
    logger.info('Finding FileItem by downloadId:', downloadItem.id);

    // Любое событие теоретически может быть вызвано до того, как данные будут
    // сохранены в БД, поэтому мы ждём следующего фрейма, чтобы данные в БД
    // успели точно обновиться
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Но всё ещё есть вероятность, что событие пришло раньше, чем был
    // установлен downloadId, однако, если загрузка была инициирована нашим
    // расширением, мы можем попытаться найти загрузку, сравнив URL,
    // у downloadItem и файлов из activeDownloads
    const fileItemsList = await findSomeFilesFromLoadItemIdsInDB(
      this.queueController.activeDownloadsList,
    );

    const targetFile = fileItemsList.find(
      (fileItem) =>
        fileItem.downloadId === downloadItem.id ||
        fileItem.url === downloadItem.url,
    );

    if (targetFile) {
      logger.debug('Founded FileItem:', targetFile);
      return targetFile;
    }

    // Если нам не удалось найти нужный объект, ищем в БД по downloadId
    const fileItems = (await indexedDBObject.getAllFromIndex(
      'fileStorage',
      'download_id',
      downloadItem.id,
    )) as FileItem[];

    // Если пользователь очистит историю загрузок в браузере,
    // то браузер начнёт создавать новые загрузки с id от 1.
    // Что потенциально может создать ситуацию, когда у нас
    // в базе будет лежать несколько FileItem с одинаковым downloadId.
    // В таком случае нас интересует только последний созданный FileItem.
    if (fileItems.length > 1) {
      logger.debug('Found multiple FileItems with the same downloadId.');
      return fileItems.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
    }

    logger.debug('Founded FileItem:', fileItems[0]);
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

    logger = logger.attachMetadata({ traceId: getTraceId() });
    logger.info('Download has been created:', downloadItem);

    let targetFile = await this.findLastFileItemByDownloadId({
      downloadItem,
      logger,
    });

    if (!targetFile) {
      // Если нам не удалось найти целевой FileItem - игнорируем событие
      logger.warning(`The related file was not found in the storage.`);
      return;
    }

    logger = logger.attachMetadata({ targetKey: targetFile.relatedLoadItemId });

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
    // Отслеживает события загрузок и управляет состоянием расширения на их основе

    let logger = globalThis.logger;
    if (
      ![downloadDelta.paused, downloadDelta.state, downloadDelta.error].some(
        Boolean,
      )
    ) {
      // Игнорируем не отслеживаемые события
      logger.debug('Ignore unknown download event for:', downloadDelta);
      return;
    }

    logger = logger.attachMetadata({ traceId: getTraceId() });
    logger.info('An event occurred:', downloadDelta);

    const downloadItem = await this.getActiveDownloadItemFromDownloadId({
      downloadId: downloadDelta.id,
      logger,
    });
    let targetFile = await this.findLastFileItemByDownloadId({
      downloadItem,
      logger,
    });

    if (!targetFile) {
      // Игнорируем загрузки, вызванные НЕ нашим расширением
      logger.warning(`The related file was not found in the storage.`);
      return;
    }

    logger = logger.attachMetadata({ targetKey: targetFile.relatedLoadItemId });

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
      if (downloadDelta.error.current === 'USER_CANCELED') {
        logger.debug('Download was canceled by user.');
        await this.cancelOneDownload({ fileItem: targetFile, logger });
      } else if (downloadDelta.error.current === 'FILE_NO_SPACE') {
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
      if (!downloadDelta.paused) {
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
    let logger = globalThis.logger;
    logger = logger.attachMetadata({ traceId: getTraceId() });

    logger.info('Request for defining file name:', downloadItem);

    if (
      downloadItem.byExtensionId !== browser.runtime.id ||
      !settings.trackEventsOnDeterminingFilename
    ) {
      logger.debug('Ignore event from other source.');
      return suggest();
    }

    this.findLastFileItemByDownloadId({
      downloadItem: downloadItem,
      logger,
    }).then(async (targetFileItem) => {
      if (!targetFileItem) {
        logger.warning('Not found target fileItem for this downloadItem');
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
    // Помечает загрузку как успешно начатую
    logger.info('Creating download:', fileItem);

    if (fileItem.status === LoadStatus.StoppedByUser) {
      // Иногда старт загрузки задерживается, в то время как она уже была
      // отменена. В этом случае необходимо отменить загрузку при старте
      logger.warning('Download created interrupted - StoppedByUser.');

      await browser.downloads.cancel(downloadItem.id);
      await browser.downloads.erase({ id: downloadItem.id });
    } else {
      logger.debug('Marking download as initiated.');
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

      logger.info('Status "Loading" was successfully established.');
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
    logger.info('The load is completed successfully:', fileItem);

    fileItem.status = LoadStatus.DownloadSuccess;
    await indexedDBObject.put('fileStorage', fileItem);

    if (fileItem.dependentFileItemId !== null) {
      logger.debug('Found a related file for downloading.');

      const nextFileItem = (await indexedDBObject.getFromIndex(
        'fileStorage',
        'file_id',
        fileItem.dependentFileItemId,
      )) as FileItem;

      if (nextFileItem.status !== LoadStatus.DownloadCandidate) {
        logger.warning(
          'Found a related file, but it is not a candidate:',
          nextFileItem,
        );
        nextFileItem.status = LoadStatus.InitiatingDownload;
      }

      await indexedDBObject.put('fileStorage', nextFileItem);
      await this.launchFileDownload({ fileItem: nextFileItem, logger });
    } else {
      logger.debug('Marking download as successful.');
      await this.queueController.successLoad({ fileItem, logger });

      this.resourceLockManager.unlock({
        type: 'loadStorage',
        id: fileItem.relatedLoadItemId,
        logger,
      });
    }
    this.startNextDownload({ logger }).then();
  }

  @attachTraceId()
  public async cancelAllDownload({
    logger = globalThis.logger,
  }: {
    logger?: Logger;
  }) {
    // Отменяет все загрузки, что были инициированы расширением
    logger.info('Cancel all downloads.');

    const groupToRemove = [
      ...this.queueController.activeDownloadsList,
      ...this.queueController.queueList.flat(2),
    ];
    await this.queueController.deleteDownloadGroup({
      groupToRemove,
      logger,
    });
    return true;
  }

  private async cancelAllDownloadsOneMovie({
    fileItem,
    logger = globalThis.logger,
  }: {
    fileItem: FileItem;
    logger?: Logger;
  }) {
    // Отменяет все загрузки, имеющие одинаковый movieId
    logger.info('Cancel all downloads for one movie.');

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
    logger.info('Attempt cancel loading:', fileItem);

    if (fileItem.downloadId) {
      const downloadItem = await this.getActiveDownloadItemFromDownloadId({
        downloadId: fileItem.downloadId,
        logger,
      });

      if (downloadItem?.state === 'in_progress') {
        logger.debug('Cancelling target download.');
        await browser.downloads.cancel(fileItem.downloadId);
      }

      if (downloadItem?.filename) {
        logger.debug('Browser has already set filename for the file.');

        const extractedRealFilename = extractFilename(downloadItem.filename);
        const extractedPrimaryFilename = extractFilename(fileItem.fileName);
        if (!extractedRealFilename.startsWith(extractedPrimaryFilename)) {
          // Если расширение не успело установить своё имя для файла, но уже начало
          // загрузку - удаляем файл, чтоб не путать пользователя
          logger.warning('Filename does not match originally. Deleting file.');
          await browser.downloads.erase({ id: fileItem.downloadId });
        }
      }

      await this.breakDownloadWithError({
        fileItem,
        cause: LoadStatus.StoppedByUser,
        logger,
      });
    } else if (!loadIsCompleted(fileItem.status)) {
      logger.debug('FileItem has no downloadId. Stopping download.');
      await this.breakDownloadWithError({
        fileItem,
        cause: LoadStatus.StoppedByUser,
        logger,
      });
    } else {
      logger.warning(
        'Attempt to stop loading interrupted - load is completed.',
      );
      this.resourceLockManager.unlock({
        type: 'loadStorage',
        id: fileItem.relatedLoadItemId,
        logger,
      });
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
    logger.info('Download paused:', fileItem);

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
    logger.info('Download resumed:', fileItem);

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
    logger.info('New load attempt:', fileItem);

    if (fileItem.status === LoadStatus.StoppedByUser) {
      logger.warning('New load attempt interrupted - StoppedByUser.');

      this.resourceLockManager.unlock({
        type: 'loadStorage',
        id: fileItem.relatedLoadItemId,
        logger,
      });
      this.startNextDownload({ logger }).then();
    } else if (fileItem.retryAttempts >= settings.maxFallbackAttempts) {
      logger.error('New load attempt interrupted - Max attempts reached.');

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
    // Прерывает загрузку с указанной причиной
    logger.info('Interrupt download with an error:', fileItem, cause);

    await this.queueController.failLoad({ fileItem, cause, logger });
    this.resourceLockManager.unlock({
      type: 'loadStorage',
      id: fileItem.relatedLoadItemId,
      logger,
    });

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
    // Подготавливает повторную попытку загрузки и отправляет её в планировщик
    logger.info('Start preparing a new download attempt:', fileItem);

    const oldDownloadId = fileItem.downloadId;

    fileItem.retryAttempts++;
    fileItem.status = LoadStatus.InitiatingDownload;

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
      logger.debug('Deleting old download:', oldDownloadId);
      await browser.downloads.erase({ id: oldDownloadId });
    }

    // Если запускаем загрузку мгновенно, всё равно даём небольшую задержку,
    // чтобы при старте браузер успел инициализироваться полностью
    const delayValue = repeatNow ? 3000 : settings.timeBetweenDownloadAttempts;
    logger.debug(`Download is scheduled to repeat in ${delayValue / 1000}s`);
    const taskName = `repeat-download-${fileItem.relatedLoadItemId}-${fileItem.id}`;
    const when = Date.now() + delayValue;
    browser.alarms.create(taskName, { when }).then();

    this.resourceLockManager.unlock({
      type: 'loadStorage',
      id: fileItem.relatedLoadItemId,
      logger,
    });
  }

  @attachTraceId()
  public async executeRetry({
    loadItemId,
    targetFileId,
    logger = globalThis.logger,
  }: {
    loadItemId: number;
    targetFileId: number;
    logger?: Logger;
  }) {
    // Запускает повторную попытку загрузки
    logger = logger.attachMetadata({ targetKey: loadItemId });
    logger.info('Trying to download again:', loadItemId);

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

    if (loadIsCompleted(targetFile.status)) {
      logger.warning('Retry failed. Target file is already completed.');
      this.resourceLockManager.unlock({
        type: 'loadStorage',
        id: loadItemId,
        logger,
      });
      return;
    }

    const siteLoader = siteLoaderFactory[loadItem.siteType];
    const siteLoadItem = await siteLoader.build(loadItem);

    targetFile.url =
      targetFile.fileType === 'video'
        ? await siteLoadItem.getVideoUrl({ logger })
        : await siteLoadItem.getSubtitlesUrl({ logger });

    await indexedDBObject.put('fileStorage', targetFile);

    return await this.launchFileDownload({ fileItem: targetFile, logger });
  }
}
