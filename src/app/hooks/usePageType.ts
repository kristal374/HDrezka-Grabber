import { useEffect, useState } from 'react';
import { PageType } from '../../lib/types';

export function usePageType(tabID: number | undefined) {
  const [pageType, setPageType] = useState<PageType | null>(null);

  useEffect(() => {
    if (!tabID) return;
    browser.scripting
      .executeScript({
        target: { tabId: tabID },
        func: getPageType,
      })
      .then((response) => {
        const result = response[0].result as PageType;
        // logger.debug(result);
        setPageType(result);
      });
  }, [tabID]);

  return pageType;
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
