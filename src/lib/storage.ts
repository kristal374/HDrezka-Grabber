import { LogLevel } from '@/lib/logger';
import browser from 'webextension-polyfill';
import { Settings } from './types';

export async function getFromStorage<T>(key: string): Promise<T | undefined> {
  const storage = await browser.storage.local.get([key]);
  return storage[key] as T | undefined;
}

export async function setToStorage<T>(key: string, value: T) {
  await browser.storage.local.set({
    [key]: value,
  });
}

export async function createDefaultSettings() {
  const DEFAULT_SETTINGS: Settings = {
    darkMode: true,
    displayQualitySize: true,
    getRealQuality: true,

    fileTypePriority: 'video',
    maxParallelDownloads: 5,
    maxParallelDownloadsEpisodes: 2,
    maxFallbackAttempts: 3,
    timeBetweenDownloadAttempts: 5_000, // ms, equals 5 seconds
    downloadStartTimeLimit: 10_000, // ms, equals 10 seconds

    actionOnNoQuality: 'reduce_quality',
    actionOnNoSubtitles: 'ignore',
    actionOnLoadSubtitleError: 'skip',
    actionOnLoadVideoError: 'skip',

    createExtensionFolders: true,
    createSeriesFolders: false,
    replaceAllSpaces: true,
    filenameFilmTemplate: ['%orig_title%'],
    filenameSeriesTemplate: ['%orig_title%', ' S', '%season_id%', 'E', '%episode_id%'],

    enableLogger: false,
    debugLevel: LogLevel.DEBUG,
    logMessageLifetime: 172_800_000, // ms, equals 2 days
    trackEventsOnDeterminingFilename: true,
  };
  await setToStorage('settings', DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function getSettings() {
  const settings = await getFromStorage<Settings>('settings');
  if (!settings) return await createDefaultSettings();
  return settings;
}

export async function loadSessionStorageSave(tabId: number) {
  const key = `t-${tabId}`;
  const sessionStorage = await browser.storage.session.get(key);
  return (sessionStorage[key] || {}) as Record<string, any>;
}

export async function saveSessionStorage(
  tabId: number,
  data: Record<string, any>,
) {
  const key = `t-${tabId}`;
  await browser.storage.session.set({ [key]: data });
}

const pendingUpdates: Record<string, any> = {};
let debounceTimer: NodeJS.Timeout | null = null;

export function saveInStorage(objName: string, data: any) {
  // Функция для динамического сохранения данных в хранилище, с возможностью
  // накопления изменений для уменьшения нагрузки на хранилище
  pendingUpdates[objName] = data;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    const snapshot = { ...pendingUpdates };
    for (const key in pendingUpdates) delete pendingUpdates[key];

    try {
      logger.debug('Update objects in storage:', snapshot);
      await browser.storage.local.set(snapshot);
    } catch (error: any) {
      logger.critical('Error saving data:', error);
    } finally {
      debounceTimer = null;
    }
  }, 150);
}

export type ObserverType<T> = {
  state: T;
  update: (fn: (draft: T) => void) => void;
};

export function createObservableStore<T extends object>(
  initial: T,
  objName: string,
  saveInStorage: (objName: string, data: any) => void,
) {
  // Создаёт объект проксирующий изменения и связывающий js объект
  // с хранилищем расширения, что позволяет синхронизировать изменения
  // между двумя объектами, не заботясь о ручном обновлении данных.
  // Так же позволяет избежать теоретического состояния гонки т.к.
  // все изменения проходят через один объект.
  const state = structuredClone(initial);

  function update(fn: (draft: T) => void) {
    fn(state);
    saveInStorage(objName, state);
  }

  return { state, update };
}
