import { getPageType } from '@/extraction-scripts/extractPageType';
import { doDatabaseStuff } from '@/lib/idb-storage';
import { getSettings, loadSessionStorageSave } from '@/lib/storage';
import {
  EventType,
  Message,
  PageType,
  RequireAllOrNone,
  Settings,
} from '@/lib/types';
import type { Runtime, Tabs } from 'webextension-polyfill';

export type PopupInitData = {
  pageType: PageType;
  needToRestoreInsideState: boolean | undefined;
} & RequireAllOrNone<{
  tabId: number;
  siteUrl: string;
  sessionStorage: Record<string, any>;
}>;

export async function popupInit(
  setInitData: React.Dispatch<React.SetStateAction<any>>,
): Promise<PopupInitData> {
  globalThis.settings = await getSettings();

  // TODO: мы можем открыть попап до установления флага needToRestoreInsideState
  const storage = await browser.storage.session.get('needToRestoreInsideState');
  const needToRestoreInsideState = storage['needToRestoreInsideState'] as
    | boolean
    | undefined;

  const currentTab = await getCurrentTab();

  const tabId = currentTab?.id;
  const siteUrl = currentTab?.url?.split('#')[0];

  eventBus.on(EventType.StorageChanged, async (changes, areaName) => {
    if (areaName !== 'local') return;

    for (const [key, value] of Object.entries(changes)) {
      if (key === 'settings') {
        globalThis.settings =
          (value.newValue as Settings | undefined) ?? (await getSettings());

        // При обновлении settings мы вызовем setInitData, который обновит
        // данные внутри RestorePopupState, и если мы не передадим текущее
        // состояние попапа, тогда будет восстановлено состояние, что было
        // на момент открытия попапа
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
    // Если тип вкладки не определён, дополнительно проводим проверку на то
    // открыта ли вкладка в режиме SplitView
    const hasSplitViewId = typeof currentTab?.splitViewId !== 'undefined';
    const isSplitView = hasSplitViewId && currentTab!.splitViewId !== -1;
    pageType = isSplitView ? 'SPLIT_VIEW' : pageType;
  }
  if (!tabId || !siteUrl) return { pageType, needToRestoreInsideState };

  await setDB();
  const sessionStorage = await loadSessionStorageSave(tabId);

  return { tabId, siteUrl, pageType, sessionStorage, needToRestoreInsideState };
}

async function getCurrentTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  // splitViewId added in Chrome 140+
  return tabs.length
    ? (tabs[0] as Tabs.Tab & { splitViewId?: number })
    : undefined;
}

async function setDB() {
  globalThis.indexedDBObject = await doDatabaseStuff();

  eventBus.on(
    EventType.DBDeletedMessage,
    (
      message: unknown,
      _sender: Runtime.MessageSender,
      sendResponse: (message: unknown) => void,
    ) => {
      const data = message as Message<any>;
      if (data.type !== 'DBDeleted') return;

      doDatabaseStuff().then((db) => {
        globalThis.indexedDBObject = db;
        sendResponse(true);
      });
      return true;
    },
  );

  eventBus.on(EventType.DBDeletedEvent, async () => {
    globalThis.indexedDBObject = await doDatabaseStuff();
  });
}
