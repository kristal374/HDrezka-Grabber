import { getPageType } from '@/extraction-scripts/extractPageType';
import { doDatabaseStuff } from '@/lib/idb-storage';
import { getSettings, loadSessionStorageSave } from '@/lib/storage';
import { EventType, PageType, RequireAllOrNone, Settings } from '@/lib/types';
import type { Tabs } from 'webextension-polyfill';

type Tab = Tabs.Tab;

export type PopupInitData = { pageType: PageType } & RequireAllOrNone<{
  tabId: number;
  siteUrl: string;
  sessionStorage: Record<string, any>;
}>;

export async function popupInit(
  setInitData: React.Dispatch<React.SetStateAction<any>>,
): Promise<PopupInitData> {
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

  eventBus.setReady();

  let pageType: PageType =
    tabId && siteUrl ? await getPageType(tabId) : 'DEFAULT';

  if (['ERROR', 'DEFAULT'].includes(pageType)) {
    const isNotSplitView = currentTab?.splitViewId === -1;
    pageType = !isNotSplitView ? 'SPLIT_VIEW' : pageType;
  }
  if (!tabId || !siteUrl) return { pageType };

  await openDB();
  const sessionStorage = await loadSessionStorageSave(tabId);

  return { tabId, siteUrl, pageType, sessionStorage };
}

async function getCurrentTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  // splitViewId added in Chrome 140+
  return tabs.length ? (tabs[0] as Tab & { splitViewId?: number }) : undefined;
}

async function openDB() {
  globalThis.indexedDBObject = await doDatabaseStuff();
  logger.info('Database open.');
}
