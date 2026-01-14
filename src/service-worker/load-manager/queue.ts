import { Logger } from '@/lib/logger';
import { Mutex, ResourceLockManager } from '@/lib/resource-lock-manager';
import {
  createObservableStore,
  getFromStorage,
  ObserverType,
  saveInStorage,
} from '@/lib/storage';
import {
  FileItem,
  Initiator,
  LoadConfig,
  LoadItem,
  LoadStatus,
  Message,
  Optional,
} from '@/lib/types';
import { loadIsCompleted } from '@/lib/utils';
import siteLoaderFactory from '@/service-worker/site-loader/factory';
import type { Downloads } from 'webextension-polyfill';

type DownloadItem = Downloads.DownloadItem;

type QueueControllerAsyncParams = {
  queue: (number | number[])[];
  activeDownloads: number[];
};

export class QueueController {
  private mutex = new Mutex();
  private resourceLockManager = new ResourceLockManager();

  private readonly queue: ObserverType<(number | number[])[]>;
  private readonly activeDownloads: ObserverType<number[]>;

  constructor({ async_param }: { async_param: QueueControllerAsyncParams }) {
    if (typeof async_param === 'undefined') {
      throw new Error('Cannot be called directly');
    }

    this.queue = createObservableStore(
      async_param.queue,
      'queue',
      saveInStorage.bind(this),
    );

    this.activeDownloads = createObservableStore(
      async_param.activeDownloads,
      'activeDownloads',
      saveInStorage.bind(this),
    );
  }

  static async build() {
    const async_param = await this.asyncConstructor();
    return new QueueController({ async_param });
  }

  private static async asyncConstructor(): Promise<QueueControllerAsyncParams> {
    return {
      queue: (await getFromStorage<(number | number[])[]>('queue')) ?? [],
      activeDownloads:
        (await getFromStorage<number[]>('activeDownloads')) ?? [],
    };
  }

  get activeDownloadsList(): readonly number[] {
    return this.activeDownloads.state;
  }

  get queueList(): readonly (number | number[])[] {
    return this.queue.state;
  }

  public async initializeNewDownload({
    initiator,
    logger = globalThis.logger,
  }: {
    initiator: Initiator;
    logger?: Logger;
  }) {
    // Отвечает за логику создания новых загрузок и добавления их в очередь
    // и за отмену активных загрузок при повторном "клике" на кнопку "Загрузить"
    logger.info('Processing of the trigger of new loading.');

    const movieId = parseInt(initiator.movieId);
    const activeDownloads = await this.findActiveDownloads({ movieId });

    if (activeDownloads.length !== 0) {
      logger.info('Cancelling active downloads.');
      await this.removeDownloadsFromQueue({
        groupToRemove: activeDownloads,
        logger,
      });
      return false;
    }

    logger.info('Creating new downloads.');
    const loadItemIds = await this.createNewDownloads({ initiator, logger });
    this.queue.update((state) => {
      state.push(loadItemIds.length === 1 ? loadItemIds[0] : loadItemIds);
    });
    logger.info('Loads were created:', loadItemIds);

    return true;
  }

  private async findActiveDownloads({
    movieId,
  }: {
    movieId: number;
  }): Promise<number[]> {
    // Ищет ID всех активных загрузок для заданного фильма и возвращает их
    const loadItems = (await indexedDBObject.getAllFromIndex(
      'loadStorage',
      'movie_id',
      movieId,
    )) as LoadItem[];

    if (loadItems.length === 0) return [];
    return loadItems
      .filter((item) => !loadIsCompleted(item.status))
      .map((item) => item.id);
  }

  async stopDownload({
    movieId,
    cause = LoadStatus.StoppedByUser,
    logger = globalThis.logger,
  }: {
    movieId: number;
    cause?: LoadStatus;
    logger?: Logger;
  }) {
    const activeDownloads = await this.findActiveDownloads({ movieId });
    if (activeDownloads.length !== 0) {
      logger.info('Cancelling active downloads.');
      await this.removeDownloadsFromQueue({
        groupToRemove: activeDownloads,
        cause,
        logger,
      });
    }

    await browser.runtime
      .sendMessage<Message<any>>({
        type: 'setNotification',
        message: {
          movieId: String(movieId),
          notification: `Загрузка прервана. Не удалось загрузить файл.`,
        },
      })
      .then((response) => {
        if (response !== 'ok') throw new Error('');
      })
      .catch(() => {});
  }

  private async skipDownload({ movieId }: { movieId: number }) {
    browser.runtime
      .sendMessage<Message<any>>({
        type: 'setNotification',
        message: {
          movieId: String(movieId),
          notification: `Сбой загрузки. Не удалось загрузить файл.`,
        },
      })
      .then((response) => {
        if (response !== 'ok') throw new Error('');
      })
      .catch(() => {});

    // TODO: в случае сбоя отправки сообщения добавлять ошибку в хранилище
  }

  public async removeDownloadsFromQueue({
    groupToRemove,
    cause = LoadStatus.StoppedByUser,
    logger = globalThis.logger,
  }: {
    groupToRemove: number[];
    cause?: LoadStatus;
    logger?: Logger;
  }) {
    // Удаляет загрузки из очереди, находящиеся в списке на удаление,
    // если есть активные загрузки - прерывает их

    if (!groupToRemove.length) return;
    logger.debug('Removing from download queue:', groupToRemove);

    await this.resourceLockManager.massLock({
      type: 'loadStorage',
      idsList: groupToRemove,
      priority: 1000,
      logger,
    });
    try {
      const readTx = indexedDBObject.transaction('loadStorage');
      const loadItems = (
        await Promise.all(groupToRemove.map((id) => readTx.store.get(id)))
      ).filter(Boolean) as LoadItem[];
      await readTx.done;

      const updatedLoadItems = await Promise.all(
        loadItems.map((loadItem) =>
          this.cancelDownload({ loadItem, cause, logger }),
        ),
      );

      const writeTx = indexedDBObject.transaction('loadStorage', 'readwrite');
      await Promise.all(
        updatedLoadItems.map((loadItem) => writeTx.store.put(loadItem)),
      );
      await writeTx.done;
    } finally {
      await this.resourceLockManager.massUnlock({
        type: 'loadStorage',
        idsList: groupToRemove,
        logger,
      });
    }
  }

  private async cancelDownload({
    loadItem,
    cause = LoadStatus.StoppedByUser,
    logger = globalThis.logger,
  }: {
    loadItem: LoadItem;
    cause: LoadStatus;
    logger?: Logger;
  }) {
    logger.debug('Canceling download:', loadItem, cause);

    if (!loadItem || loadIsCompleted(loadItem.status)) return loadItem;
    loadItem.status = cause;

    if (this.activeDownloads.state.includes(loadItem.id)) {
      const relatedFiles = (await indexedDBObject.getAllFromIndex(
        'fileStorage',
        'load_item_id',
        loadItem.id,
      )) as FileItem[];

      for (const file of relatedFiles) {
        if (file.downloadId !== null) {
          const browserFile = (
            await browser.downloads.search({ id: file.downloadId })
          )[0] as DownloadItem | undefined;

          if (!browserFile) continue;

          // Вызываем failLoad перед cancel для того, чтоб установить
          // "свой" статус прерывания загрузки, вместо "StoppedByUser"
          // который будет установлен после вызова cancel
          await this.failLoad({ fileItem: file, cause, logger });
          await browser.downloads.cancel(file.downloadId);
          return loadItem;
        }
      }

      if (relatedFiles.length === 0) {
        const index = this.activeDownloads.state.indexOf(loadItem.id);
        this.activeDownloads.update((state) => {
          state.splice(index, 1);
        });
      } else {
        // Если по каким-то причинам мы не нашли загружаемый файл -
        // отменяем загрузку вслепую
        logger.warning('Failed to find downloadable file:', loadItem);
        await this.failLoad({ fileItem: relatedFiles[0], cause, logger });
      }
      return loadItem;
    } else {
      // Поскольку нам нужно удалить всего один единственный объект,
      // мы можем не бояться того, что после удаления диапазон объектов
      // внутри массива сместится
      for (let i = 0; i < this.queue.state.length; i++) {
        const group = this.queue.state[i];

        if (group === loadItem.id) {
          this.queue.update((state) => {
            state.splice(i, 1);
          });
          return loadItem;
        }

        if (Array.isArray(group)) {
          const idx = group.indexOf(loadItem.id);

          if (idx !== -1) {
            this.queue.update((state) => {
              if (group.length === 1) {
                state.splice(i, 1);
              } else {
                (state[i] as number[]).splice(idx, 1);
              }
            });
            return loadItem;
          }
        }
      }

      logger.warning('Failed to find an LoadItem in queue.');
      return loadItem;
    }
  }

  private async createNewDownloads({
    initiator,
    logger = globalThis.logger,
  }: {
    initiator: Initiator;
    logger?: Logger;
  }): Promise<number[]> {
    // Создаёт новые загрузки и добавляет их в хранилище
    const movieId = parseInt(initiator.movieId);
    const siteLoader = siteLoaderFactory[initiator.site_type];

    const tx = indexedDBObject.transaction(
      ['urlDetail', 'loadConfig', 'loadStorage'],
      'readwrite',
    );
    const urlDetailStore = tx.objectStore('urlDetail');
    const urlDetailIndex = urlDetailStore.index('movie_id');
    const loadConfigStore = tx.objectStore('loadConfig');
    const loadItemsStore = tx.objectStore('loadStorage');

    const currentPage =
      (await urlDetailIndex.get(movieId)) ??
      siteLoader.createUrlDetails(initiator);
    const loadConfig = siteLoader.createLoadConfig(initiator);
    currentPage.loadRegistry.push(loadConfig.createdAt);

    const loadItems = this.makeLoadItemArray({ initiator, logger });
    loadConfig.loadItemIds = await Promise.all(
      loadItems.map((item) => loadItemsStore.put(item)),
    );

    loadConfigStore.put(loadConfig);
    urlDetailStore.put(currentPage);
    tx.done;

    return loadConfig.loadItemIds;
  }

  private makeLoadItemArray({
    initiator,
    logger = globalThis.logger,
  }: {
    initiator: Initiator;
    logger?: Logger;
  }) {
    // Создаёт массив объектов, на основе которых будет производиться загрузка
    const movieId = parseInt(initiator.movieId);
    const siteLoader = siteLoaderFactory[initiator.site_type];
    const loadItemArray: Optional<LoadItem, 'id'>[] = [];

    if (initiator.range) {
      for (const [seasonId, seasonData] of Object.entries(initiator.range)) {
        const season = { id: seasonId, title: seasonData.title };
        for (const episode of seasonData.episodes) {
          loadItemArray.push(
            siteLoader.createLoadItem(movieId, season, episode),
          );
        }
      }
    } else {
      loadItemArray.push(siteLoader.createLoadItem(movieId));
    }

    logger.info(`Created ${loadItemArray.length} item for loading.`);
    return loadItemArray;
  }

  public async getNextObjectIdForDownload({
    logger = globalThis.logger,
  }: {
    logger?: Logger;
  }): Promise<number | null> {
    // Отвечает за получение объекта, на основе которого будет производиться загрузка
    logger.info('Attempt to get next object for download.');

    // Вызов getNextObjectIdForDownload должен быть исключительно
    // последовательным, иначе количество загрузок может выходить за лимит
    const release = await this.mutex.acquire();
    try {
      if (this.queue.state.length === 0) {
        logger.debug('Currently there are no available objects for loading.');
        return null;
      }
      if (this.activeDownloads.state.length >= settings.maxParallelDownloads) {
        logger.debug('Currently there are too many active downloads.');
        return null;
      }

      for (let i = 0; i < this.queue.state.length; i++) {
        const item = this.queue.state[i];
        if (!Array.isArray(item)) {
          this.queue.update((state) => {
            state.splice(i, 1);
          });
          this.activeDownloads.update((state) => {
            state.push(item);
          });
          return item;
        }

        const loadConfig = (await indexedDBObject.getFromIndex(
          'loadConfig',
          'load_item_ids',
          item[0],
        )) as LoadConfig;

        const numberActiveDownloads = this.activeDownloads.state.filter((id) =>
          loadConfig.loadItemIds.includes(id),
        ).length;
        if (numberActiveDownloads >= settings.maxParallelDownloadsEpisodes)
          continue;

        const targetItem = item[0];
        this.activeDownloads.update((state) => {
          state.push(targetItem);
        });
        this.queue.update((state) => {
          if (item.length <= 1) {
            state.splice(i, 1);
          } else {
            (state[i] as number[]).shift();
          }
        });

        return targetItem;
      }
      logger.warning('Failed to find an object to download.');
      return null;
    } finally {
      release();
    }
  }

  async successLoad({
    fileItem,
    logger = globalThis.logger,
  }: {
    fileItem: FileItem;
    logger?: Logger;
  }) {
    // Находит и удаляет объект из активных загрузок
    // и помечает его как успешно загруженный
    const loadItem = (await indexedDBObject.getFromIndex(
      'loadStorage',
      'load_id',
      fileItem.relatedLoadItemId,
    )) as LoadItem;
    loadItem.status = LoadStatus.DownloadSuccess;
    await indexedDBObject.put('loadStorage', loadItem);

    const index = this.activeDownloads.state.indexOf(
      fileItem.relatedLoadItemId,
    );
    this.activeDownloads.update((state) => {
      state.splice(index, 1);
    });

    logger.info('Load was successful:', loadItem);
  }

  async failLoad({
    fileItem,
    cause,
    logger = globalThis.logger,
  }: {
    fileItem: FileItem;
    cause: LoadStatus;
    logger?: Logger;
  }) {
    // Находит и удаляет объект из активных загрузок
    // и помечает его как сбой загрузки.
    // В зависимости от настроек пользователя определяет реакцию на сбой
    logger.debug('Mark download as failed:', fileItem, cause);

    // Обновляем сам объект загрузки
    const loadItem = (await indexedDBObject.getFromIndex(
      'loadStorage',
      'load_id',
      fileItem.relatedLoadItemId,
    )) as LoadItem;
    loadItem.status = cause;
    await indexedDBObject.put('loadStorage', loadItem);

    const relatedFiles = (await indexedDBObject.getAllFromIndex(
      'fileStorage',
      'load_item_id',
      loadItem.id,
    )) as FileItem[];

    // И так же обновляем статусы для всех связанных файлов
    await Promise.all(
      relatedFiles.map(async (file) => {
        if (loadIsCompleted(file.status)) return;
        if (file.id === fileItem.id || cause === LoadStatus.StoppedByUser) {
          return await indexedDBObject.put('fileStorage', {
            ...file,
            status: cause,
          });
        }

        return await indexedDBObject.put('fileStorage', {
          ...file,
          status: LoadStatus.InitiationError,
        });
      }),
    );

    const index = this.activeDownloads.state.indexOf(loadItem.id);
    this.activeDownloads.update((state) => {
      state.splice(index, 1);
    });

    if (cause === LoadStatus.StoppedByUser) return;

    if (fileItem.url === null) {
      const actionOnNoUrl =
        fileItem.fileType === 'video'
          ? settings.actionOnNoQuality
          : settings.actionOnNoSubtitles;

      if (actionOnNoUrl === 'stop') {
        return await this.stopDownload({ movieId: loadItem.movieId, logger });
      } else if (actionOnNoUrl === 'skip') {
        return await this.skipDownload({ movieId: loadItem.movieId });
      } else if (
        actionOnNoUrl === 'ignore' &&
        fileItem.fileType === 'subtitle'
      ) {
        logger.warning('Subtitle download skip:', fileItem);
        return;
      }
    }

    logger.info('Load was failed:', loadItem);
    const action =
      fileItem.fileType === 'video'
        ? settings.actionOnLoadVideoError
        : settings.actionOnLoadSubtitleError;

    if (action === 'stop') {
      await this.stopDownload({ movieId: loadItem.movieId, logger });
    } else if (action === 'skip') {
      await this.skipDownload({ movieId: loadItem.movieId });
    } else {
      throw new Error('Unknown action on load error');
    }
  }
}
