import { createContext, useContext, useEffect, useState } from 'react';
import { Logger } from '../../lib/logger';
import { PageType } from '../../lib/types';

const logger = await Logger.create('/src/js/popup.js.map');

const TargetTabContext = createContext<number | undefined>(undefined);

const StatusContext = createContext<PageType | null>(null);

export function useTabID() {
  return useContext(TargetTabContext);
}

export function usePageType() {
  return useContext(StatusContext);
}

export function CurrentTabProvider({ children }: React.PropsWithChildren) {
  const [id, setId] = useState<number>();
  const [pageType, setPageType] = useState<PageType | null>(null);

  useEffect(() => {
    getCurrentTabId().then((tabID) => {
      if (!tabID) return;
      setId(tabID);

      browser.scripting
        .executeScript({
          target: { tabId: tabID },
          func: getPageType,
        })
        .then((response) => {
          const result = response[0].result as PageType;
          logger.debug(result);
          setPageType(result);
        });
    });
  }, []);

  return (
    <TargetTabContext.Provider value={id}>
      <StatusContext.Provider value={pageType}>
        {children}
      </StatusContext.Provider>
    </TargetTabContext.Provider>
  );
}

async function getCurrentTabId() {
  const tabs = await browser.tabs.query({ active: true });
  if (tabs && tabs.length > 0) {
    return tabs[0].id;
  } else {
    return undefined;
  }
}

async function getPageType(): Promise<PageType> {
  const regexp =
    /sof\.tv\.(.*?)\((\d+), (\d+), (\d+), (\d+), (\d+|false|true), '(.*?)', (false|true), ({".*?":.*?})\);/;
  const playerConfig = document.documentElement.outerHTML.match(regexp);

  if (playerConfig === null) {
    const initFunc =
      document.documentElement.outerHTML.match(/sof\.tv\.(.*?)\(/);
    const trailerURL = document
      .getElementById('videoplayer')
      ?.children[0].getAttribute('src');

    if (!!trailerURL) return 'TRAILER';
    if (initFunc !== null && initFunc[1] === 'initWatchingEvents')
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
