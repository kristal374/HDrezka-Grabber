import { PageType } from '@/lib/types';

export async function getPageType(tabId: number) {
  return await browser.scripting
    .executeScript({
      target: { tabId },
      func: extractPageType,
    })
    .then((response) => {
      return response[0].result as PageType;
    })
    .catch((error) => {
      logger.error(error);
      return 'ERROR' as PageType;
    });
}

async function extractPageType(): Promise<PageType> {
  const playerConfig = document.documentElement.outerHTML.match(
    /sof\.tv\.(.*?)\((\d+), (\d+), (\d+), (\d+), (\d+|false|true), '(.*?)', (false|true), (false|true), ({".*?":.*?})\);/,
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
  const playerInfo = JSON.parse(playerConfig[10]);
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
