import browser from 'webextension-polyfill';

export async function getFromStorage<T>(key: string): Promise<T> {
  const storage = await browser.storage.local.get([key]);
  return storage[key] as T;
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

export async function loadSessionStorageSave(tabID: number) {
  const key = `t-${tabID}`;
  const sessionStorage = await browser.storage.session.get(key);
  return (sessionStorage[key] || {}) as Record<string, any>;
}
