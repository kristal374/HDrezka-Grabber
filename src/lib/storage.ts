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
  const storage = await browser.storage.local.get()
  if (Object.keys(storage).length !== 0) return

  await setToStorage('debugFlag', true);
  await setToStorage('darkMode', true);

  await setToStorage('maxDownloads', 5);
  await setToStorage('maxEpisodeDownloads', 2);
  await setToStorage('activeDownloads', []);
  await setToStorage('queue', []);
  await setToStorage('storage', {});
  await setToStorage('last_uid', 0);
}
