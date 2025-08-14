import { getPageType } from '../extraction-scripts/extractPageType';
import {
  createDefaultSettings,
  getFromStorage,
  loadSessionStorageSave,
} from '../lib/storage';

export async function init() {
  await setDarkMode();
  const currentTab = await getCurrentTab();

  if (!currentTab) return {};
  const tabId = currentTab.id;
  const siteUrl = currentTab.url?.split('#')[0];

  if (!tabId || !siteUrl) return {};
  const pageType = await getPageType(tabId);
  const sessionStorage = await loadSessionStorageSave(tabId);

  return { tabId, siteUrl, pageType, sessionStorage };
}

export type InitData = Required<Awaited<ReturnType<typeof init>>>;

async function setDarkMode() {
  let darkMode = await getFromStorage<boolean | undefined>('darkMode');
  if (darkMode === undefined) {
    await createDefaultSettings();
    darkMode = await getFromStorage<boolean>('darkMode');
  }
  logger.debug('darkMode:', darkMode);
  if (!darkMode) {
    document.documentElement.classList.add('light');
  }
}

async function getCurrentTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs.length > 0 ? tabs[0] : undefined;
}
