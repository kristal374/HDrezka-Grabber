import {
  createDefaultSettings,
  getFromStorage,
  loadSessionStorageSave,
} from '../lib/storage';
import { PageType } from '../lib/types';

export async function init() {
  logger.info('Popup open');
  await setDarkMode();
  const tabID = await getCurrentTabID();
  if (!tabID) return {};
  const pageType = await getPageType(tabID);
  const sessionStorage = await loadSessionStorageSave(tabID);
  return { tabID, pageType, sessionStorage };
}

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

async function getCurrentTabID() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tabID = tabs && tabs.length > 0 ? tabs[0].id : undefined;
  logger.debug(`Current tab id: ${tabID}`);
  return tabID;
}

async function getPageType(tabID: number) {
  return await browser.scripting
    .executeScript({
      target: { tabId: tabID },
      func: extractPageType,
    })
    .then((response) => {
      const result = response[0].result as PageType;
      logger.debug(result);
      return result;
    })
    .catch((error) => {
      logger.error(`TypeError: ${error.name}. Message: ${error.message}`);
      return 'ERROR' as PageType;
    });
}

async function extractPageType(): Promise<PageType> {
  const playerConfig = document.documentElement.outerHTML.match(
    /sof\.tv\.(.*?)\((\d+), (\d+), (\d+), (\d+), (\d+|false|true), '(.*?)', (false|true), ({".*?":.*?})\);/,
  );

  if (playerConfig === null) {
    const initFunc =
      document.documentElement.outerHTML.match(/sof\.tv\.(.*?)\(/);
    const trailerURL = document
      .getElementById('videoplayer')
      ?.children[0].getAttribute('src');

    if (!!trailerURL) return 'TRAILER';
    if (
      initFunc !== null &&
      (initFunc[1] === 'initWatchingEvents' || initFunc[1] === 'initEvents')
    )
      return 'UNAVAILABLE';
    return 'DEFAULT';
  }
  const playerInfo = JSON.parse(playerConfig[9]);
  const argsIsFalse: boolean = Object.values(playerInfo).every(
    (value) => value === false,
  );

  if (playerConfig[1] === 'initCDNMoviesEvents' && argsIsFalse)
    return 'LOCATION_FILM';
  if (playerConfig[1] === 'initCDNSeriesEvents' && argsIsFalse)
    return 'LOCATION_SERIAL';
  if (playerConfig[1] === 'initCDNMoviesEvents') return 'FILM';
  if (playerConfig[1] === 'initCDNSeriesEvents') return 'SERIAL';
  return 'ERROR';
}
