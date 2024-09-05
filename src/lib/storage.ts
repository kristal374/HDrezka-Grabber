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
}
