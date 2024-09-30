import browser from 'webextension-polyfill';
import {
  Episode,
  Initiator,
  LoadInfo,
  QualityItem,
  QueryData,
} from '../lib/types';
import {
  decodeURL,
  formatBytes,
  getQualityFileSize,
  updateVideoData,
} from './handler';
import { getFromStorage } from '../lib/storage';

export class LoadManager {
  private maxDownloads: number = 5;
  private maxEpisodeDownloads: number = 2;
  private maxAttemptRetries: number = 3;

  private activeDownloads: number[] = [];
  private queue: (number | number[])[] = [];
  private storage: Record<number, LoadInfo> = {};

  private last_uid = 0;
  private batchMode: boolean = false;
  private readonly processingAccess: Promise<void> = Promise.resolve();

  constructor() {
    this.processingAccess = this.init();

    browser.downloads.onChanged.addListener(this.observer.bind(this));
    browser.downloads.onCreated.addListener(this.handleCreated.bind(this));
    try {
      // @ts-ignore
      chrome.downloads.onDeterminingFilename.addListener(
        (item: any, suggest: Function) => {
          const uID = this.get_uid_from_download_id(item.id);
          if (uID === null) return true;
          suggest({
            conflictAction: 'uniquify',
            filename: this.get_full_path(uID),
          });
        },
      );
    } catch (e) {}
  }

  private async init() {
    this.maxDownloads =
      (await getFromStorage('maxDownloads')) || this.maxDownloads;
    this.maxEpisodeDownloads =
      (await getFromStorage('maxEpisodeDownloads')) || this.maxEpisodeDownloads;
    this.activeDownloads = this.createProxy(
      (await getFromStorage('activeDownloads')) || this.activeDownloads,
      'activeDownloads',
    );
    this.queue = this.createProxy(
      (await getFromStorage('queue')) || this.queue,
      'queue',
    );
    this.storage = this.createProxy(
      (await getFromStorage('storage')) || this.storage,
      'storage',
    );
    this.last_uid = (await getFromStorage('last_uid')) || 0;
  }

  async init_new_load(initiator: Initiator) {
    await this.processingAccess;

    let loadInfo: LoadInfo | LoadInfo[];
    if (initiator.query_data.action === 'get_stream') {
      loadInfo = [];
      for (const [s, data] of Object.entries(initiator.range!)) {
        for (const episode of data.episodes) {
          loadInfo.push(
            this.createLoadInfo(
              initiator,
              { id: s, title: data.title },
              episode,
            ),
          );
        }
      }
    } else {
      loadInfo = this.createLoadInfo(initiator);
    }
    const matchingDownloads = this.findActiveDownloads(initiator.site_url);
    if (matchingDownloads) {
      this.removeFromDownloadQueue(matchingDownloads);
    } else {
      this.enqueueDownload(loadInfo);
    }
    return await this.start_next_load();
  }

  createLoadInfo(
    initiator: Initiator,
    season?: { title: string; id: string },
    episode?: Episode,
  ): LoadInfo {
    return {
      uid: ++this.last_uid,
      download_id: null,
      query_data:
        initiator.query_data.action === 'get_movie'
          ? initiator.query_data
          : {
              id: initiator.query_data.id,
              translator_id: initiator.query_data.translator_id,
              episode: episode!.id,
              season: season!.id,
              favs: initiator.query_data.favs,
              action: initiator.query_data.action,
            },
      relative_path: '',
      absolute_path: null,
      local_film_name: initiator.local_film_name,
      original_film_name: initiator.original_film_name,
      filename: null,
      url: null,
      site_url: initiator.site_url,
      size: null,
      voice_over: initiator.voice_over,
      season_name: season?.title,
      episode_name: episode?.title,
      quality: initiator.quality,
      subtitle: initiator.subtitle,
      attempts_retries: this.maxAttemptRetries,
      timestamp: initiator.timestamp.toString(),
      status: 'LoadCandidate',
    };
  }

  findActiveDownloads(siteURL: string): number[] | false {
    const matchingItems = Object.values(this.storage).filter(
      (item) => item.site_url === siteURL,
    );

    if (matchingItems.length === 0) return false;

    const groupedByTimestamp: Record<string, LoadInfo[]> = {};
    for (const item of matchingItems) {
      if (!groupedByTimestamp[item.timestamp]) {
        groupedByTimestamp[item.timestamp] = [];
      }
      groupedByTimestamp[item.timestamp].push(item);
    }

    for (const group of Object.values(groupedByTimestamp)) {
      for (const loadInfo of group) {
        if (
          [
            'LoadCandidate',
            'InitiatingDownload',
            'Loading',
            'DownloadPaused',
          ].includes(loadInfo.status)
        ) {
          return group.map((i) => i.uid);
        }
      }
    }

    return false;
  }

  removeFromDownloadQueue(groupToRemove: number[]) {
    let queueIsRemoved = false;
    for (const uID of groupToRemove) {
      if (!["DownloadFailed", "DownloadSuccess"].includes(this.storage[uID].status)) {
        this.storage[uID].status = "StoppedByUser"
      }
      if (this.activeDownloads.includes(uID)) {
        browser.downloads.cancel(this.storage[uID].download_id!).catch(() => {});
        this.activeDownloads.splice(this.activeDownloads.indexOf(uID), 1);
      }
      if (queueIsRemoved) continue;
      for (let i = 0; i < this.queue.length; i++) {
        const group = this.queue[i];
        if (uID === group || (Array.isArray(group) && group.includes(uID))) {
          this.queue.splice(i, 1);
          break;
        }
      }
    }
  }

  enqueueDownload(loadInfo: LoadInfo | LoadInfo[]) {
    this.initBatch();
    if (Array.isArray(loadInfo)) {
      const uIdArray = loadInfo.map((item) => {
        this.storage[item.uid] = item;
        return item.uid;
      });
      this.queue.push(uIdArray);
    } else {
      this.storage[loadInfo.uid] = loadInfo;
      this.queue.push(loadInfo.uid);
    }
    this.pushBatch();
  }

  getObjectForLoad() {
    if (
      this.queue.length === 0 ||
      this.activeDownloads.length >= this.maxDownloads
    )
      return null;
    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];
      if (!Array.isArray(item)) {
        this.queue.splice(i, 1);
        if (this.storage[item] === undefined) continue;
        return this.storage[item];
      }
      const filmID = this.storage[item[0]].query_data.id;
      const counter = this.activeDownloads.filter(
        (uid) => this.storage[uid].query_data.id === filmID,
      ).length;
      if (counter >= this.maxEpisodeDownloads) continue;
      if (item.length <= 1) {
        this.queue.splice(i, 1);
      }
      const nextObj = this.storage[item.shift()!];
      if (nextObj === undefined) continue;
      return nextObj;
    }
    return null;
  }

  async start_next_load(): Promise<false | number> {
    const next_obj = this.getObjectForLoad();
    if (next_obj === null) return false;

    this.activeDownloads.push(next_obj.uid);
    next_obj.status = 'InitiatingDownload';
    next_obj.filename = await this.get_filename(
      ' ',
      next_obj.query_data.id,
      next_obj.local_film_name,
      next_obj.original_film_name,
      next_obj.query_data.translator_id,
      'season' in next_obj.query_data ? next_obj.query_data.season : null,
      'episode' in next_obj.query_data ? next_obj.query_data.episode : null,
      next_obj.quality,
      next_obj.subtitle?.code || null,
    );
    const correctURL = await this.getCorrectURL(
      next_obj.site_url,
      next_obj.query_data,
      next_obj.quality,
    );
    // @ts-ignore
    if (correctURL !== null && next_obj.status !== "StoppedByUser") {
      next_obj.url = correctURL.url;
      next_obj.quality = correctURL.quality;

      next_obj.download_id = await this.downloadFile(
        next_obj.url,
        this.get_full_path(next_obj.uid),
        next_obj.query_data.action === "get_movie",
      );
    } else {
      this.activeDownloads.splice(
        this.activeDownloads.indexOf(next_obj.uid),
        1,
      );
      next_obj.status = 'InitiationError';
    }
    this.start_next_load().then();
    return next_obj.uid;
  }

  async set_path(uID: number, path: string) {
    this.storage[uID].absolute_path = path;
  }

  async success_load(uID: number) {
    this.storage[uID].status = 'DownloadSuccess';
    this.activeDownloads.splice(this.activeDownloads.indexOf(uID), 1);
    this.start_next_load().then();
  }

  async stop_load(uID: number) {
    this.storage[uID].status = 'StoppedByUser';
    this.activeDownloads.splice(this.activeDownloads.indexOf(uID), 1);
  }

  async pause_load(uID: number) {
    this.storage[uID].status = 'DownloadPaused';
  }

  async resume_load(uID: number) {
    this.storage[uID].status = 'Loading';
  }

  async remove_load(uID: number) {
    this.removeFromDownloadQueue([uID])
    delete this.storage[uID];
  }

  async new_attempt_load(uID: number) {
    if (this.storage[uID].attempts_retries <= 0) {
      await browser.downloads.cancel(this.storage[uID].download_id!);
      await this.unrecognized_error_load(uID);
    } else {
      this.storage[uID].attempts_retries--;
      return new Promise<void>((resolve) => {
        setTimeout(async () => {
          await browser.downloads.resume(this.storage[uID].download_id!);
          resolve();
        }, 3000);
      });
    }
  }

  async unrecognized_error_load(uID: number) {
    this.storage[uID].status = 'DownloadFailed';
    this.activeDownloads.splice(this.activeDownloads.indexOf(uID), 1);
  }

  async observer(downloadDelta: browser.Downloads.OnChangedDownloadDeltaType) {
    console.log('observer info', downloadDelta);
    await this.processingAccess;

    const uID = this.get_uid_from_download_id(downloadDelta.id);
    if (uID === null) return;

    if (downloadDelta.filename?.current) {
      await this.set_path(uID, downloadDelta.filename.current);
    } else if (downloadDelta.state?.current === 'complete') {
      await this.success_load(uID);
    } else if (downloadDelta.error?.current === 'USER_CANCELED') {
      await this.stop_load(uID);
    } else if (downloadDelta.error?.current === 'NETWORK_FAILED') {
      await this.new_attempt_load(uID);
    } else if (downloadDelta.paused?.current === true) {
      await this.pause_load(uID);
    } else if (downloadDelta.paused?.current === false) {
      await this.resume_load(uID);
    } else if (downloadDelta.error?.current) {
      await this.unrecognized_error_load(uID);
    }
  }

  async handleCreated(downloadItem: browser.Downloads.DownloadItem) {
    await this.processingAccess;

    const uid = this.get_uid_from_download_id(downloadItem.id);
    if (uid === null) return;

    this.storage[uid].status = 'Loading';
    this.storage[uid].url = downloadItem.url;
    this.storage[uid].size = {
      stringSize: formatBytes(downloadItem.fileSize),
      rawSize: downloadItem.fileSize,
    };
  }

  private async downloadFile(url: string, filename: string, saveAs: boolean) {
    return await browser.downloads.download({
      url: url,
      filename: filename,
      saveAs: saveAs,
    });
  }

  private async getCorrectURL(
    site_url: string,
    query_data: QueryData,
    quality: QualityItem,
  ) {
    const response = await updateVideoData(site_url, query_data);
    const urlsContainer = await decodeURL(response.url);
    const qualitySizes = await getQualityFileSize(urlsContainer);
    if (qualitySizes === null) return null;

    let qualityPassedFlag = false;
    const qualityArr: QualityItem[] = [
      '4K',
      '2K',
      '1080p Ultra',
      '1080p',
      '720p',
      '480p',
      '360p',
    ];

    for (const qualityItem of qualityArr) {
      if (qualityPassedFlag || quality === qualityItem) {
        qualityPassedFlag = true;
        const urlItem = qualitySizes[qualityItem];
        if (urlItem === undefined) continue;
        if (urlItem.rawSize === 0) continue;
        return { url: urlItem.url, quality: qualityItem };
      }
    }
    return null;
  }

  private get_uid_from_download_id(download_id: number) {
    for (const item of Object.values(this.storage)) {
      if (item.download_id === download_id) return item.uid;
    }
    return null;
  }

  private get_full_path(uID: number) {
    const { relative_path, filename } = this.storage[uID];
    return `${relative_path ? relative_path + '/' : ''}${filename}`;
  }

  private async get_filename(
    separator: string,
    film_id: string,
    title: string,
    orig_title: string | null,
    translator_id: string,
    season_id: string | null,
    episode_id: string | null,
    quality: QualityItem,
    subtitle: string | null,
  ) {
    // TODO: Создать логику формирования имени файла в зависимости от шаблона пользователя
    return `${orig_title}${season_id !== null ? ` S${season_id} E${episode_id}` : ''}.mp4`;
  }

  private initBatch() {
    this.batchMode = true;
  }

  private pushBatch() {
    this.batchMode = false;
    this.saveAll();
  }

  private saveAll() {
    this.saveInStorage('last_uid', this.last_uid).then();

    // Здесь индекс "-1" вернёт исходный объект
    this.saveInStorage('activeDownloads', this.activeDownloads[-1]).then();
    this.saveInStorage('queue', this.queue[-1]).then();
    this.saveInStorage('storage', this.storage[-1]).then();
  }

  private async saveInStorage(objName: string, data: any) {
    if (this.batchMode) return;
    // @ts-ignore
    await browser.storage.local.set({ [objName]: data });
  }

  private createProxy<T extends object>(target: T, objName: string): T {
    const func = this.saveInStorage.bind(this);
    const handleSet = <T extends object>(
      origin: T,
      prop: string | symbol,
      value: any,
      receiver: any,
    ): boolean => {
      const response = Reflect.set(origin, prop, value, receiver);
      func(objName, target).then();
      return response;
    };
    const handleDelete = <T extends object>(
      origin: T,
      prop: string | symbol,
    ): boolean => {
      const response = Reflect.deleteProperty(origin, prop);
      func(objName, target).then();
      return response;
    };

    return new Proxy(target, {
      get: (origin, prop, receiver) => {
        if (prop === '-1') return origin;
        const value = Reflect.get(origin, prop, receiver);
        if (typeof value === 'object' && value !== null) {
          return new Proxy(value, {
            set: handleSet,
            deleteProperty: handleDelete,
          });
        }
        return value;
      },
      set: handleSet,
      deleteProperty: handleDelete,
    });
  }
}