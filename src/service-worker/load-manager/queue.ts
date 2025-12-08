import { ResourceLockManager } from '@/lib/resource-lock-manager';
import { createProxy, getFromStorage, saveInStorage } from '@/lib/storage';
import {
  ContentType,
  Episode,
  FileItem,
  Initiator,
  LoadConfig,
  LoadItem,
  LoadStatus,
  Season,
  SeasonsWithEpisodesList,
  UrlDetails,
} from '@/lib/types';
import { loadIsCompleted } from '@/lib/utils';

type QueueControllerAsyncParams = {
  queue: (number | number[])[];
  activeDownloads: number[];
};

export class QueueController {
  private resourceLockManager = new ResourceLockManager();

  private readonly queue: (number | number[])[];
  private activeDownloads: number[];

  constructor(async_param: QueueControllerAsyncParams | undefined) {
    if (typeof async_param === 'undefined') {
      throw new Error('Cannot be called directly');
    }

    this.queue = createProxy(
      async_param.queue,
      'queue',
      saveInStorage.bind(this),
    );
    this.activeDownloads = createProxy(
      async_param.activeDownloads,
      'activeDownloads',
      saveInStorage.bind(this),
    );
  }

  static async build() {
    const async_result = await this.asyncConstructor();
    return new QueueController(async_result);
  }

  private static async asyncConstructor(): Promise<QueueControllerAsyncParams> {
    return {
      queue: (await getFromStorage<(number | number[])[]>('queue')) ?? [],
      activeDownloads:
        (await getFromStorage<number[]>('activeDownloads')) ?? [],
    };
  }

  public async initializeNewDownload(initiator: Initiator) {
    // Отвечает за логику создания новых загрузок и добавления их в очередь
    // и за отмену активных загрузок при повторном "клике" на кнопку "Загрузить"
    logger.info('Processing of the trigger of new loading.');

    const movieId = parseInt(initiator.movieId);
    const activeDownloads = await this.findActiveDownloads(movieId);

    if (activeDownloads.length !== 0) {
      logger.info('Cancelling active downloads.');
      await this.removeDownloadsFromQueue(activeDownloads);
      return false;
    }

    logger.info('Creating new downloads.');
    const loadItemIds = await this.createNewDownloads(initiator);
    this.queue.push(loadItemIds.length === 1 ? loadItemIds[0] : loadItemIds);
    logger.info('Loads were created:', loadItemIds);

    return true;
  }

  private async findActiveDownloads(movieId: number): Promise<number[]> {
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

  async stopDownload(
    movieId: number,
    cause: LoadStatus = LoadStatus.StoppedByUser,
  ) {
    const activeDownloads = await this.findActiveDownloads(movieId);
    if (activeDownloads.length !== 0) {
      logger.info('Cancelling active downloads.');
      await this.removeDownloadsFromQueue(activeDownloads, cause);
    }

    await messageBroker.sendMessage(movieId, {
      priority: 100,
      stackable: false,
      message: 'Загрузка прервана. Не удалось загрузить файл.',
      type: 'warning',
    });
  }

  private async skipDownload(movieId: number) {
    await messageBroker.sendMessage(movieId, {
      priority: 100,
      stackable: false,
      message: 'Сбой загрузки. Не удалось загрузить файл.',
      type: 'warning',
    });
  }

  private async removeDownloadsFromQueue(
    groupToRemove: number[],
    cause: LoadStatus = LoadStatus.StoppedByUser,
  ) {
    // Удаляет загрузки из очереди, находящиеся в списке на удаление,
    // если есть активные загрузки - прерывает их
    logger.debug('Removing from download queue:', groupToRemove);

    await Promise.all(
      groupToRemove.map((id) =>
        this.resourceLockManager.run(
          { type: 'loadStorage', id },
          this.cancelDownload.bind(this, id, cause),
          1000,
        ),
      ),
    );
  }

  private async cancelDownload(
    id: number,
    cause: LoadStatus = LoadStatus.StoppedByUser,
  ) {
    logger.debug('Canceling download:', id, cause);
    const record = (await indexedDBObject.getFromIndex(
      'loadStorage',
      'load_id',
      id,
    )) as LoadItem | undefined;

    if (!record || loadIsCompleted(record.status)) return;

    if (this.activeDownloads.includes(record.id)) {
      const relatedFiles = (await indexedDBObject.getAllFromIndex(
        'fileStorage',
        'load_item_id',
        record.id,
      )) as FileItem[];

      for (const file of relatedFiles) {
        if (file.downloadId === null) {
          await this.failLoad(file, cause);
        } else {
          await browser.downloads.cancel(file.downloadId);
        }
      }
    } else {
      record.status = cause;
      await indexedDBObject.put('loadStorage', record);

      for (let i = 0; i < this.queue.length; i++) {
        const group = this.queue[i];
        if (
          id === group ||
          (Array.isArray(group) && group.includes(record.id))
        ) {
          this.queue.splice(i, 1);
          break;
        }
      }
    }
  }

  private async createNewDownloads(initiator: Initiator): Promise<number[]> {
    // Создаёт новые загрузки и добавляет их в хранилище
    const tx = indexedDBObject.transaction(
      ['urlDetail', 'loadConfig', 'loadStorage'],
      'readwrite',
    );
    const urlDetailStore = tx.objectStore('urlDetail');
    const urlDetailIndex = urlDetailStore.index('movie_id');
    const loadConfigStore = tx.objectStore('loadConfig');
    const loadItemsStore = tx.objectStore('loadStorage');

    const movieId = parseInt(initiator.movieId);
    const currentPage =
      (await urlDetailIndex.get(movieId)) ?? this.createUrlDetails(initiator);
    const loadConfig = this.createLoadConfig(initiator);
    currentPage.loadRegistry.push(loadConfig.createdAt);

    const loadItems = this.makeLoadItemArray(movieId, initiator.range);
    loadConfig.loadItemIds = await Promise.all(
      loadItems.map((item) => loadItemsStore.put(item)),
    );

    loadConfigStore.put(loadConfig);
    urlDetailStore.put(currentPage);
    tx.done;

    return loadConfig.loadItemIds;
  }

  private makeLoadItemArray(
    movieId: number,
    range: SeasonsWithEpisodesList | null,
  ) {
    // Создаёт массив объектов, на основе которых будет производиться загрузка
    const loadItemArray: (Omit<LoadItem, 'id'> & { id?: number })[] = [];
    if (!(range === null)) {
      for (const [seasonId, seasonData] of Object.entries(range)) {
        const season = { id: seasonId, title: seasonData.title };
        for (const episode of seasonData.episodes) {
          loadItemArray.push(this.createLoadItem(movieId, season, episode));
        }
      }
    } else {
      loadItemArray.push(this.createLoadItem(movieId));
    }
    logger.info(`Created ${loadItemArray.length} item for loading.`);
    return loadItemArray;
  }

  private createLoadItem(
    movieId: number,
    season?: Season,
    episode?: Episode,
  ): Omit<LoadItem, 'id'> & { id?: number } {
    return {
      siteType: 'hdrezka',
      movieId: movieId,
      season: season ?? null,
      episode: episode ?? null,
      content: ContentType.both,
      availableQualities: null,
      availableSubtitles: null,
      status: LoadStatus.DownloadCandidate,
    };
  }

  private createLoadConfig(initiator: Initiator): LoadConfig {
    return {
      voiceOver: initiator.voice_over,
      quality: initiator.quality,
      subtitle: initiator.subtitle,
      favs: initiator.favs,
      loadItemIds: [],
      createdAt: parseInt(initiator.timestamp),
    };
  }

  private createUrlDetails(initiator: Initiator): UrlDetails {
    return {
      movieId: parseInt(initiator.movieId),
      siteUrl: initiator.site_url,
      filmTitle: initiator.film_name,
      loadRegistry: [],
    };
  }

  public async getNextObjectIdForDownload(): Promise<number | null> {
    // Отвечает за получение объекта, на основе которого будет производиться загрузка
    logger.info('Attempt to get next object for download.');

    if (this.queue.length === 0) {
      logger.debug('Currently there are no available objects for loading.');
      return null;
    }
    if (this.activeDownloads.length >= settings.maxParallelDownloads) {
      logger.debug('Currently there are too many active downloads.');
      return null;
    }

    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];
      if (!Array.isArray(item)) {
        this.queue.splice(i, 1);
        this.activeDownloads.push(item);
        return item;
      }

      const loadConfig = (await indexedDBObject.getFromIndex(
        'loadConfig',
        'load_item_ids',
        item[0],
      )) as LoadConfig;

      const numberActiveDownloads = this.activeDownloads.filter((id) =>
        loadConfig.loadItemIds.includes(id),
      ).length;
      if (numberActiveDownloads >= settings.maxParallelDownloadsEpisodes)
        continue;
      if (item.length <= 1) {
        this.queue.splice(i, 1);
      }
      this.activeDownloads.push(item[0]);
      return item.shift()!;
    }
    logger.warning('Failed to find an object to download.');
    return null;
  }

  async successLoad(fileItem: FileItem) {
    // Находит и удаляет объект из активных загрузок
    // и помечает его как успешно загруженный
    const loadItem = (await indexedDBObject.getFromIndex(
      'loadStorage',
      'load_id',
      fileItem.relatedLoadItemId,
    )) as LoadItem;
    loadItem.status = LoadStatus.DownloadSuccess;
    await indexedDBObject.put('loadStorage', loadItem);

    this.activeDownloads.splice(
      this.activeDownloads.indexOf(fileItem.relatedLoadItemId),
      1,
    );

    this.resourceLockManager.unlock({
      type: 'loadStorage',
      id: fileItem.relatedLoadItemId,
    });
    logger.info('Load was successful:', loadItem);
  }

  async failLoad(fileItem: FileItem, cause: LoadStatus) {
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

    this.activeDownloads.splice(this.activeDownloads.indexOf(loadItem.id), 1);

    if (cause === LoadStatus.StoppedByUser) return;

    if (fileItem.url === null) {
      const actionOnNoUrl =
        fileItem.fileType === 'video'
          ? settings.actionOnNoQuality
          : settings.actionOnNoSubtitles;

      if (actionOnNoUrl === 'stop') {
        return await this.stopDownload(loadItem.movieId);
      } else if (actionOnNoUrl === 'skip') {
        return await this.skipDownload(loadItem.movieId);
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
      await this.stopDownload(loadItem.movieId);
    } else if (action === 'skip') {
      await this.skipDownload(loadItem.movieId);
    } else {
      throw new Error('Unknown action on load error');
    }
  }
}
