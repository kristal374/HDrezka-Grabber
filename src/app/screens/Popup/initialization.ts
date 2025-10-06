import { getPageType } from '../../../extraction-scripts/extractPageType';
import { doDatabaseStuff } from '../../../lib/idb-storage';
import { getSettings, loadSessionStorageSave } from '../../../lib/storage';
import { EventType, Settings } from '../../../lib/types';

export type PopupInitData = Required<Awaited<ReturnType<typeof popupInit>>>;

export async function popupInit(
  setInitData: React.Dispatch<React.SetStateAction<any>>,
) {
  globalThis.settings = await getSettings();
  globalThis.permissions = await browser.permissions.getAll();

  const currentTab = await getCurrentTab();

  const tabId = currentTab?.id;
  const siteUrl = currentTab?.url?.split('#')[0];

  eventBus.on(EventType.StorageChanged, async (changes, areaName) => {
    if (areaName !== 'local') return;

    for (const [key, value] of Object.entries(changes)) {
      if (key === 'settings') {
        globalThis.settings =
          (value.newValue as Settings | undefined) ?? (await getSettings());
        const newSessionStorage = tabId
          ? { sessionStorage: await loadSessionStorageSave(tabId) }
          : {};

        setInitData((prev: PopupInitData) => ({
          ...prev,
          ...newSessionStorage,
        }));
      }
    }
  });

  const handler = async () => {
    globalThis.permissions = await browser.permissions.getAll();
    const newSessionStorage = tabId
      ? { sessionStorage: await loadSessionStorageSave(tabId) }
      : {};

    setInitData((prev: PopupInitData) => ({
      ...prev,
      ...newSessionStorage,
    }));
  };

  eventBus.on(EventType.PermissionAdded, handler);
  eventBus.on(EventType.PermissionRemoved, handler);

  eventBus.setReady();

  if (!tabId || !siteUrl) return null;

  await openDB();
  const pageType = await getPageType(tabId);
  const sessionStorage = await loadSessionStorageSave(tabId);

  return { tabId, siteUrl, pageType, sessionStorage };
}

async function getCurrentTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs.length > 0 ? tabs[0] : undefined;
}

async function openDB() {
  globalThis.indexedDBObject = await doDatabaseStuff();
  logger.info('Database open.');
}
