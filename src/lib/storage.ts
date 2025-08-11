import browser from 'webextension-polyfill';

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
  await setToStorage('debugFlag', true);
  await setToStorage('darkMode', true);

  await setToStorage('maxDownloads', 5);
  await setToStorage('maxEpisodeDownloads', 2);
  await setToStorage('activeDownloads', []);
  await setToStorage('queue', []);
  await setToStorage('lastUId', 0);
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

export async function saveInStorage(objName: string, data: any): Promise<void> {
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
      logger.critical('Error saving data:', error.toString());
    } finally {
      debounceTimer = null;
    }
  }, 0);
}

export function createProxy<T extends object>(
  target: T,
  objName: string,
  saveInStorage: (objName: string, data: any) => Promise<void>,
  realTarget?: any,
): T {
  // Создаёт объект прокси связывающий js объект с хранилищем
  // расширения, что позволяет синхронизировать изменения между
  // двумя объектами не заботясь о ручном обновлении данных.
  // Так же позволяет избежать теоретического состояния гонки т.к.
  // все изменения проходят через один объект.
  const proxiesCache = new WeakMap<object, any>();

  const handler: ProxyHandler<T> = {
    set(origin, prop, value, receiver) {
      value = value['origin'] !== undefined ? value['origin'] : value;
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

// TODO: Переработать модуль