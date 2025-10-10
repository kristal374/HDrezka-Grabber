const STORAGE_KEY = 'firstRun';

export async function isFirstRunExtension() {
  const storage = await browser.storage.session.get(STORAGE_KEY);
  const isFirstRun = (storage.STORAGE_KEY as false | undefined) ?? true;
  logger.debug(`Extension is first run: ${isFirstRun}`);

  if (isFirstRun) {
    await browser.storage.session.set({ [STORAGE_KEY]: false });
    return isFirstRun;
  }
  return isFirstRun;
}
