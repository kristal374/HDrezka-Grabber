import browser from 'webextension-polyfill';
import logger from './background-logger';
import {
  Episode,
  FileInfo,
  FilmData,
  Initiator,
  LoadConfig,
  LoadItem,
  QualityItem,
  SerialData,
  SimpleSeason,
  URLItem,
} from '../lib/types';
import { fetchUrlSizes, getQualityFileSize, updateVideoData } from './handler';
import { decodeVideoURL } from '../lib/link-processing';
import { hashCode } from '../lib/utils';

function AwaitProcessingAccess<T extends { [key: string]: any }>() {
  // Декоратор позволяющй дождаться полной инициализации класса
  // перед вызовом метода
  return function (
    target: T,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: T, ...args: any[]) {
      if (
        this.processingAccess &&
        typeof this.processingAccess.then === 'function'
      ) {
        await this.processingAccess;
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

function createProxy<T extends object>(
  target: T,
  objName: string,
  saveInStorage: (objName: string, data: any) => Promise<void>,
  realTarget?: T,
): T {
  // Создаёт объект прокси связывающий js объект с хранилищем
  // расширения что позволяет синхронизировать изменения между
  // двумя объектами не заботясь о ручном обновлении данных
  const proxiesCache = new WeakMap<object, any>();

  const handler: ProxyHandler<T> = {
    set(origin, prop, value, receiver) {
      const result = Reflect.set(origin, prop, value, receiver);
      saveInStorage(objName, realTarget || target).then();
      return result;
    },
    deleteProperty(origin, prop) {
      const result = Reflect.deleteProperty(origin, prop);
      saveInStorage(objName, realTarget || target).then();
      return result;
    },
    get(origin, prop, receiver) {
      if (prop === 'origin') return origin;
      const value = Reflect.get(origin, prop, receiver);

      if (typeof value === 'object' && value !== null) {
        if (!proxiesCache.has(value)) {
          proxiesCache.set(
            value,
            createProxy(value, objName, saveInStorage, realTarget || origin),
          );
        }
        return proxiesCache.get(value);
      }
      return value;
    },
  };

  return new Proxy(target, handler);
}

export class LoadManager {
  private _lastUId = 0;
  private maxDownloads: number = 5;
  private maxEpisodeDownloads: number = 2;
  private maxAttemptRetries: number = 3;
  private askAboutLoadingLocation: boolean = true;

  private storage: Record<number, LoadItem> = {};
  private urlStorage: Record<number, LoadConfig[]> = {};
  private activeDownloads: number[] = [];
  private queue: (number | number[])[] = [];

  private processingAccess: Promise<void> = Promise.resolve();
  private pendingUpdates: Record<string, any> = {};
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.processingAccess = this.init();

    browser.downloads.onChanged.addListener(this.observer.bind(this));
    browser.downloads.onCreated.addListener(this.handleCreated.bind(this));

    try {
      // @ts-ignore
      chrome.downloads.onDeterminingFilename.addListener(
        (item: any, suggest: Function) => {
          // Когда начинается загрузка "рекомендует" имя для загружаемого файла.
          // Актуально только для хрома и реализовано исключительно во избежании
          // конфликтов с другими расширениями которые могут назначать имена файлов.
          const uId = this.getUIdFromDownloadId(item.id);
          if (uId === null) return true;
          suggest({
            conflictAction: 'uniquify',
            filename: this.storage[uId].file.fileName,
          });
        },
      );
    } catch (e) {}
  }

  get lastUId() {
    return this._lastUId;
  }

  set lastUId(value) {
    // setter для lastUId, так же обновляет данные в хранилище
    this.saveInStorage('lastUId', value);
    this._lastUId = value;
  }

  private async init() {
    // Инициализирует LoadManager, извлекает данные из хранилища и применяет их
    logger.info('Initializing LoadManager...');
    const allData: Record<string, any> = await browser.storage.local.get(null);

    this._lastUId = allData['lastUId'] || 0;
    this.maxDownloads = allData['maxDownloads'] || this.maxDownloads;
    this.maxEpisodeDownloads =
      allData['maxEpisodeDownloads'] || this.maxEpisodeDownloads;

    this.storage = this.prepareSpecificData(allData, 'd');
    this.urlStorage = this.prepareSpecificData(allData, 'u');
    this.activeDownloads = this.createProxyForObject(
      allData['activeDownloads'] || this.activeDownloads,
      'activeDownloads',
    );
    this.queue = this.createProxyForObject(
      allData['queue'] || this.queue,
      'queue',
    );

    logger.info('LoadManager is ready to go.');
  }

  prepareSpecificData(allData: Record<string, any>, keyIdentifier: string) {
    // Подготавливает данные из хранилища для работы с объектами, создаёт прокси.
    // Возвращает связанный объект-прокси с хранилищем.
    const specificData: Record<number, any> = Object.entries(allData)
      .filter(([key, _value]) => key.startsWith(`${keyIdentifier}-`))
      .reduce(
        (acc, [key, value]) => {
          const realKey = parseInt(key.split('-')[1]);
          acc[realKey] = this.createProxyForObject(
            value,
            `${keyIdentifier}-${realKey}`,
          );
          return acc;
        },
        {} as { [uid: string]: any },
      );

    const makeProxy = this.createProxyForObject.bind(this);
    const save = this.saveInStorage.bind(this);

    const handler: ProxyHandler<Record<number, LoadItem>> = {
      set(
        target: Record<number, LoadItem>,
        prop: string | symbol,
        newValue: any,
        receiver: any,
      ): boolean {
        save(`${keyIdentifier}-${prop}`, newValue);
        return Reflect.set(
          target,
          prop,
          makeProxy(newValue, `${keyIdentifier}-${prop}`),
          receiver,
        );
      },
      deleteProperty(
        target: Record<number, LoadItem>,
        prop: string | symbol,
      ): boolean {
        if (target[prop]) {
          browser.storage.local.remove(`${keyIdentifier}-${prop}`);
          delete target[prop];
        }
        return true;
      },
    };
    return new Proxy(specificData, handler);
  }

  @AwaitProcessingAccess()
  async initNewLoad(initiator: Initiator) {
    // Формирует основные объекты для загрузки на основе которых
    // будут производиться все остальные действия и делает проверку
    // во избежание дублирования загрузок. В случае если уже
    // существуют активные загрузки url которых совпадает
    // с url инициатора отменяет/прерывает их.

    logger.debug('Trigger new load:', initiator);
    const matchActiveDownloads = await this.findActiveDownloads(
      initiator.site_url,
    );
    if (matchActiveDownloads.length !== 0) {
      logger.info('Cancelling active downloads.');
      await this.removeFromDownloadQueue(matchActiveDownloads);
      return 0;
    }
    logger.info('Creating new load.');
    const loadItems: LoadItem[] = await this.makeLoadItemArray(initiator);

    if (!this.urlStorage[hashCode(initiator.site_url)])
      this.urlStorage[hashCode(initiator.site_url)] = [];
    const loadConfig = this.createLoadConfig(initiator);
    loadConfig.loadItems = loadItems.map((item) => item.uid);
    this.urlStorage[hashCode(initiator.site_url)].push(loadConfig);

    await this.enqueueDownload(loadItems);
    return await this.startNextLoad();
  }

  async makeLoadItemArray(initiator: Initiator): Promise<LoadItem[]> {
    // Формирует массив объектов на основе которых будет производится загрузка
    const loadItemArray: LoadItem[] = [];
    if (initiator.query_data.action === 'get_stream') {
      for (const [s, data] of Object.entries(initiator.range!)) {
        for (const episode of data.episodes) {
          loadItemArray.push(
            this.createLoadItem(
              initiator,
              { id: s, title: data.title },
              episode,
            ),
          );
        }
      }
    } else {
      loadItemArray.push(this.createLoadItem(initiator));
    }
    if (loadItemArray.length === 1 && this.askAboutLoadingLocation) {
      loadItemArray[0].file.saveAs = true;
    }
    logger.info(`Created ${loadItemArray.length} item for loading.`);
    return loadItemArray;
  }

  private createLoadConfig(initiator: Initiator): LoadConfig {
    const filmTitle = {
      localized: initiator.film_name.localized,
      original: initiator.film_name.original,
    };
    return {
      siteUrl: initiator.site_url,
      filmTitle: filmTitle,
      subtitle: initiator.subtitle,
      voiceOver: initiator.voice_over,
      quality: initiator.quality,
      loadItems: [],
      createdAt: initiator.timestamp as string,
    };
  }

  private createLoadItem(
    initiator: Initiator,
    season?: SimpleSeason,
    episode?: Episode,
  ): LoadItem {
    // Отвечает за корректное создание одного LoadItem
    const queryData: FilmData | SerialData =
      initiator.query_data.action === 'get_movie'
        ? {
            id: initiator.query_data.id,
            translator_id: initiator.voice_over.id,
            is_camrip: initiator.voice_over.is_camrip!,
            is_director: initiator.voice_over.is_director!,
            is_ads: initiator.voice_over.is_ads!,
            favs: initiator.query_data.favs,
            action: initiator.query_data.action,
          }
        : {
            id: initiator.query_data.id,
            translator_id: initiator.voice_over.id,
            episode: episode!.id,
            season: season!.id,
            favs: initiator.query_data.favs,
            action: initiator.query_data.action,
          };
    const file: FileInfo = {
      downloadId: null,
      fileName: null,
      realQuality: null,
      absolutePath: null,
      urlItem: null,
      saveAs: false,
    };
    return {
      uid: ++this.lastUId,
      urlHash: hashCode(initiator.site_url),
      queryData,
      season: season || null,
      episode: episode || null,
      file,
      retryAttempts: 0,
      status: 'LoadCandidate',
    };
  }

  async findActiveDownloads(siteUrl: string): Promise<number[]> {
    // Возвращает список uid активных загрузок для заданного url
    const activeDownloads: number[] = [];
    const currentSiteDownloads: LoadConfig[] =
      this.urlStorage[hashCode(siteUrl)]?.filter(
        (item) => item.siteUrl === siteUrl,
      ) || [];

    if (currentSiteDownloads.length === 0) return activeDownloads;

    for (const loads of currentSiteDownloads) {
      for (const itemUId of loads.loadItems) {
        if (
          [
            'DownloadSuccess',
            'DownloadFailed',
            'StoppedByUser',
            'InitiationError',
          ].includes(this.storage[itemUId].status)
        )
          continue;
        activeDownloads.push(itemUId);
      }
    }
    return activeDownloads;
  }

  async enqueueDownload(loadItems: LoadItem[]) {
    // Добавляет загрузки в долгосрочное хранилище и в очередь
    const uIdArray = loadItems.map((item) => {
      this.storage[item.uid] = item;
      return item.uid;
    });
    this.queue.push(uIdArray.length === 1 ? uIdArray[0] : uIdArray);
  }

  async removeFromDownloadQueue(groupToRemove: number[]) {
    // Удаляет загрузки из очереди, но не из хранилища,
    // так же отменяет активные загрузки если таковые существуют
    for (const uId of groupToRemove) {
      if (
        [
          'DownloadSuccess',
          'DownloadFailed',
          'StoppedByUser',
          'InitiationError',
        ].includes(this.storage[uId].status)
      )
        continue;
      this.storage[uId].status = 'StoppedByUser';
      for (let i = 0; i < this.queue.length; i++) {
        const group = this.queue[i];
        if (uId === group || (Array.isArray(group) && group.includes(uId))) {
          this.queue.splice(i, 1);
          break;
        }
      }
    }
    for (let i = this.activeDownloads.length - 1; i >= 0; i--) {
      const uid = this.activeDownloads[i];
      if (!groupToRemove.includes(uid)) continue;
      this.activeDownloads.splice(i, 1);
      if (this.storage[uid].file.downloadId === null) {
        this.storage[uid].status = 'StoppedByUser';
        continue;
      }
      browser.downloads.cancel(this.storage[uid].file.downloadId!).then();
    }
  }

  private async startNextLoad(): Promise<number> {
    // Отеает за правильную последовательность инициализации
    // загрузки, а так же запускает её
    logger.info('Attempt starting load.');
    const nextLoadObj = await this.getNextObjectForLoad();

    if (nextLoadObj === null || nextLoadObj.status !== 'LoadCandidate') {
      logger.info('Attempt of starting loading is interrupted successfully.');
      return 0;
    }

    logger.debug('Start initiating download for:', nextLoadObj['origin']);
    nextLoadObj.status = 'InitiatingDownload';
    this.activeDownloads.push(nextLoadObj.uid);

    const [urlItem, realQuality] = await this.getActualURL(nextLoadObj);

    logger.debug('URL info for load received:', urlItem);
    if (!urlItem?.url || nextLoadObj.status !== 'InitiatingDownload')
      return this.removeItemFromActiveDownloads(nextLoadObj);

    nextLoadObj.file.urlItem = urlItem;
    nextLoadObj.file.realQuality = realQuality;
    nextLoadObj.file.fileName = await this.makeFilename(nextLoadObj);

    try {
      if (nextLoadObj.status !== 'InitiatingDownload')
        return this.removeItemFromActiveDownloads(nextLoadObj);
      logger.info('Download started...');
      nextLoadObj.file.downloadId = await browser.downloads.download({
        url: nextLoadObj.file.urlItem!.url,
        filename: this.makeFilepath(nextLoadObj.file.fileName!),
        saveAs: nextLoadObj.file.saveAs,
      });
      logger.info(
        'Download started successfully:',
        nextLoadObj.file.downloadId,
      );
      return nextLoadObj.uid;
    } catch (e) {
      logger.error('Download failed:', e);
      return this.removeItemFromActiveDownloads(nextLoadObj);
    } finally {
      this.startNextLoad().then();
    }
  }

  private removeItemFromActiveDownloads(loadItem: LoadItem) {
    // Прерывает инициализацию загрузки и удаляет ее из списка активных
    logger.info('Load cancelled:', loadItem);
    this.activeDownloads.splice(this.activeDownloads.indexOf(loadItem.uid), 1);
    if (loadItem.status !== 'StoppedByUser')
      loadItem.status = 'InitiationError';
    return 0;
  }

  private async getNextObjectForLoad(): Promise<LoadItem | null> {
    // Отвечает за получение объекта на основе которого будет производится загрузка
    if (
      this.queue.length === 0 ||
      this.activeDownloads.length >= this.maxDownloads
    )
      return null;
    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];
      if (!Array.isArray(item)) {
        this.queue.splice(i, 1);
        return this.storage[item];
      }
      const serialId = this.storage[item[0]].queryData.id;
      const numberActiveDownloads = this.activeDownloads.filter(
        (uid) => this.storage[uid].queryData.id === serialId,
      ).length;
      if (numberActiveDownloads >= this.maxEpisodeDownloads) continue;
      if (item.length <= 1) {
        this.queue.splice(i, 1);
      }
      return this.storage[item.shift()!];
    }
    return null;
  }

  private async getActualURL(
    loadItem: LoadItem,
  ): Promise<[URLItem, QualityItem] | [null, null]> {
    // Отвечает за получение и декодирования URL видео, так же если
    // запрашиваемое качество отсутствует в списке автоматически понижает его
    const loadConfig = this.findLoadConfig(loadItem.urlHash, loadItem.uid);

    if (!loadConfig) return [null, null];
    const newVideoData = await updateVideoData(
      loadConfig.siteUrl,
      loadItem.queryData,
    );
    if (!newVideoData.success || !newVideoData.url) return [null, null];
    const qualitiesList = decodeVideoURL(newVideoData.url)!;

    if (loadConfig.quality in qualitiesList) {
      const urlItem = await fetchUrlSizes(qualitiesList[loadConfig.quality]!);
      if (urlItem.rawSize > 0) return [urlItem, loadConfig.quality];
    }

    delete qualitiesList[loadConfig.quality];
    const qualitySizes = await getQualityFileSize(qualitiesList);
    if (qualitySizes === null) return [null, null];
    const qualityArr: QualityItem[] = [
      '4K',
      '2K',
      '1080p Ultra',
      '1080p',
      '720p',
      '480p',
      '360p',
    ];

    let qualityPassedFlag = false;
    for (const qualityItem of qualityArr) {
      if (qualityPassedFlag || loadConfig.quality === qualityItem) {
        qualityPassedFlag = true;
        if (
          !(
            qualityItem in qualitySizes &&
            qualitySizes[qualityItem]?.rawSize! > 0
          )
        )
          continue;
        return [qualitySizes[qualityItem]!, qualityItem];
      }
    }

    return [null, null];
  }

  private async makeFilename(loadItem: LoadItem): Promise<string> {
    // Формирует итоговое имя для загружаемого файла
    // на основе шаблона пользователя и данных загрузки
    // TODO: Создать логику формирования имени файла в зависимости от шаблона пользователя
    const loadConfig = this.findLoadConfig(loadItem.urlHash, loadItem.uid)!;
    const filmTitle: string =
      loadConfig.filmTitle.original || loadConfig.filmTitle.localized;
    const filename = filmTitle
      .split('/')[0]
      .trim()
      .replace(/\s/g, '_')
      .replace(/[:;]+/, '');
    const season = loadItem?.season!.title;
    const episode = loadItem?.episode!.title;
    const seasonNumber = season?.match(/Сезон\s(\d+(?:-\d+)?)/);
    const episodeNumber = episode?.match(/Серия\s(\d+(?:-\d+)?)/);
    const postfix = season
      ? `_S${seasonNumber ? seasonNumber[1] : season}_E${episodeNumber ? episodeNumber[1] : episode}`
      : '';
    return `${filename}${postfix}.mp4`;
  }

  private makeFilepath(filename: string): string {
    // Формирует путь для загружаемого файла на основе настроек пользователя
    // TODO: Создать логику формирования пути
    return filename;
  }

  @AwaitProcessingAccess()
  async observer(downloadDelta: browser.Downloads.OnChangedDownloadDeltaType) {
    // Отслеживает событиями во время загрузки
    // и на основе этих событий принимает решения
    logger.debug('An event occurred:', downloadDelta);
    const uid = this.getUIdFromDownloadId(downloadDelta.id);
    if (uid === null) return;

    if (downloadDelta.filename?.current)
      await this.setPath(uid, downloadDelta.filename.current);

    if (downloadDelta.state?.current === 'complete') {
      await this.successLoad(uid);
    } else if (downloadDelta.error?.current === 'USER_CANCELED') {
      await this.stopLoad(uid);
    } else if (downloadDelta.error?.current === 'NETWORK_FAILED') {
      await this.newAttemptLoad(uid);
    } else if (downloadDelta.error?.current === 'SERVER_FAILED') {
      await this.newAttemptLoad(uid);
    } else if (downloadDelta.error?.current) {
      await this.unrecognizedErrorLoad(uid);
    }

    if (downloadDelta.paused?.current === true) {
      await this.pauseLoad(uid);
    } else if (downloadDelta.paused?.current === false) {
      await this.resumeLoad(uid);
    }
  }

  async setPath(uID: number, path: string) {
    // Обработчик изменения пути скачивания
    logger.debug('Path changed:', uID, path);
    this.storage[uID].file.absolutePath = path;
  }

  async successLoad(uID: number) {
    // Обработчик успешного завершения загрузки
    logger.debug('The load is completed successfully:', uID);
    this.storage[uID].status = 'DownloadSuccess';
    this.activeDownloads.splice(this.activeDownloads.indexOf(uID), 1);
    this.startNextLoad().then();
  }

  async stopLoad(uID: number) {
    // Обработчик остановки загрузки
    logger.debug('Download stopped:', uID);
    this.storage[uID].status = 'StoppedByUser';
    this.activeDownloads.splice(this.activeDownloads.indexOf(uID), 1);
    browser.downloads.cancel(this.storage[uID].file.downloadId!).then();
    this.startNextLoad().then();
  }

  async pauseLoad(uID: number) {
    // Обработчик паузы загрузки
    logger.debug('Download paused:', uID);
    this.storage[uID].status = 'DownloadPaused';
    browser.downloads.pause(this.storage[uID].file.downloadId!).then();
  }

  async resumeLoad(uID: number) {
    // Обработчик возобнавления загрузки
    logger.debug('Download resumed:', uID);
    this.storage[uID].status = 'Loading';
    browser.downloads.resume(this.storage[uID].file.downloadId!).then();
  }

  // async removeLoad(uID: number) {
  //   this.removeFromDownloadQueue([uID]);
  //   delete this.storage[uID];
  // }

  async newAttemptLoad(uID: number) {
    // Пытается повторить загрузку в случае неожиданного прерывания
    logger.debug('New load attempt:', uID);
    if (this.storage[uID].status === 'StoppedByUser') {
      logger.warning('New load attempt interrupted - StoppedByUser:', uID);
      return;
    }
    if (this.storage[uID].retryAttempts >= this.maxAttemptRetries) {
      logger.warning(
        'New load attempt interrupted - Max attempts reached:',
        uID,
      );
      await browser.downloads.cancel(this.storage[uID].file.downloadId!);
      await this.unrecognizedErrorLoad(uID);
    } else {
      this.storage[uID].retryAttempts++;
      setTimeout(async () => {
        logger.info('Start new load attempt:', uID);
        await browser.downloads.resume(this.storage[uID].file.downloadId!);
      }, 5000);
    }
  }

  async unrecognizedErrorLoad(uID: number) {
    // Обработчик неизвестных ошибок
    logger.error('Unrecognized error while loading:', uID);
    this.storage[uID].status = 'DownloadFailed';
    this.activeDownloads.splice(this.activeDownloads.indexOf(uID), 1);
  }

  @AwaitProcessingAccess()
  async handleCreated(downloadItem: browser.Downloads.DownloadItem) {
    // Обработчик успешной инициализации загрузки
    const uid = this.getUIdFromDownloadId(downloadItem.id);
    if (uid === null) return;
    if (this.storage[uid].status === 'StoppedByUser') {
      logger.warning('Download created interrupted - StoppedByUser:', uid);
      await browser.downloads.cancel(downloadItem.id);
      await browser.downloads.erase({ id: downloadItem.id });
    } else {
      logger.info('Download successfully started:', downloadItem.id);
      this.storage[uid].status = 'Loading';
      this.storage[uid].file.urlItem!.url = downloadItem.url;
    }
  }

  private getUIdFromDownloadId(downloadId: number) {
    // Находит UID которому соответствует ID загрузки
    for (const loadItem of Object.values(this.storage)) {
      if (loadItem.file.downloadId === downloadId) return loadItem.uid;
    }
    return null;
  }

  private findLoadConfig(siteUrlHash: number, uid: number): LoadConfig | null {
    return (
      this.urlStorage[siteUrlHash].find((item) =>
        item.loadItems.includes(uid),
      ) || null
    );
  }

  async saveInStorage(objName: string, data: any): Promise<void> {
    // Метод для динамического сохранения данных в хранилище, с возможностью
    // накопления изменений для уменьшения нагрузки на хранилище
    this.pendingUpdates[objName] = data;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(async () => {
      const snapshot = { ...this.pendingUpdates };
      this.pendingUpdates = {};

      try {
        logger.debug('Update keys in storage:', Object.keys(snapshot));
        await browser.storage.local.set(snapshot);
      } catch (error) {
        logger.error('Error saving data:', error);
      } finally {
        this.debounceTimer = null;
      }
    }, 100);
  }

  private createProxyForObject<T extends object>(
    target: T,
    objName: string,
  ): T {
    // Метод для создания прокси, связывающего реальный объект с хранилищем
    return createProxy(target, objName, this.saveInStorage.bind(this));
  }
}
