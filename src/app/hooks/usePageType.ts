import { useEffect, useState } from 'react';
import { PageType } from '../../lib/types';
import { useTabID } from '../providers/CurrentTabProvider';

export function usePageType() {
  const tabID = useTabID();
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
      })
      .catch((error) => {
        logger.error(`TypeError: ${error.name}. Message: ${error.message}`);
        setPageType('ERROR');
      });
  }, [tabID]);

  return pageType;
}

async function getPageType(): Promise<PageType> {
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
