import { FilmInfo, PageType, SerialInfo, SubtitleInfo } from '../../lib/types';
import { useEffect, useState } from 'react';
import { useTabID } from '../providers/CurrentTabProvider';

export function useMovieInfo(pageType: PageType) {
  const tabID = useTabID();
  const [movieInfo, setMovieInfo] = useState<
    [FilmInfo | SerialInfo | null, SubtitleInfo | null]
  >([null, null]);

  useEffect(() => {
    if (!tabID || !pageType) return;

    browser.scripting
      .executeScript({
        target: { tabId: tabID },
        func: pageType === 'SERIAL' ? extractSerialInfo : extractFilmInfo,
      })
      .then((response) => {
        const result = response[0].result as [
          FilmInfo | SerialInfo,
          SubtitleInfo,
        ];
        // logger.debug(result);
        setMovieInfo(result);
      });
  }, [tabID, pageType]);

  return movieInfo;
}

async function extractFilmInfo() {
  const regexp =
    /sof\.tv\.(.*?)\((\d+), (\d+), (\d+), (\d+), (\d+|false|true), '(.*?)', (false|true), ({".*?":.*?})\);/;
  const playerConfig = document.documentElement.outerHTML.match(
    regexp,
  ) as RegExpMatchArray;
  const playerInfo = JSON.parse(playerConfig[9]);

  const translateElement = document.querySelector('.b-translator__item.active');
  const extractedInfo: FilmInfo = {
    film_id: playerConfig[2],
    translator_id: translateElement
      ? translateElement.getAttribute('data-translator_id')!
      : playerConfig[3],
    is_camrip: translateElement
      ? translateElement.getAttribute('data-camrip')!
      : playerConfig[4],
    is_ads: translateElement
      ? translateElement.getAttribute('data-ads')!
      : playerConfig[6],
    is_director: translateElement
      ? translateElement.getAttribute('data-director')!
      : playerConfig[5],
    favs: document.getElementById('ctrl_favs')!.getAttribute('value')!,
    action: 'get_movie',
    local_film_name: document.querySelector('.b-post__title h1')!.textContent!,
    original_film_name:
      document.querySelector('.b-post__origtitle')?.textContent!,
    streams: playerInfo['streams'],
  };
  const subtitleInfo: SubtitleInfo = {
    subtitle: playerInfo['subtitle'],
    subtitle_def: playerInfo['subtitle_def'],
    subtitle_lns: playerInfo['subtitle_lns'],
  };
  return [extractedInfo, subtitleInfo] as const;
}

async function extractSerialInfo() {
  const regexp =
    /sof\.tv\.(.*?)\((\d+), (\d+), (\d+), (\d+), (\d+|false|true), '(.*?)', (false|true), ({".*?":.*?})\);/;
  const playerConfig = document.documentElement.outerHTML.match(
    regexp,
  ) as RegExpMatchArray;
  const playerInfo = JSON.parse(playerConfig[9]);

  const translateID = document.querySelector('.b-translator__item.active');
  const seasonID = document.querySelector(
    '.b-simple_seasons__list .b-simple_season__item.active',
  );
  const episodeID = document.querySelector(
    '.b-simple_episodes__list .b-simple_episode__item.active',
  );

  const extractedInfo: SerialInfo = {
    film_id: parseInt(playerConfig[2]),
    translator_id: translateID
      ? parseInt(translateID.getAttribute('data-translator_id')!)
      : parseInt(playerConfig[3]),
    season_id: seasonID
      ? parseInt(seasonID.getAttribute('data-tab_id')!)
      : parseInt(playerConfig[4]),
    episode_id: episodeID
      ? parseInt(episodeID.getAttribute('data-episode_id')!)
      : parseInt(playerConfig[5]),
    favs: document.getElementById('ctrl_favs')!.getAttribute('value')!,
    action: 'get_stream',
    local_film_name: document.querySelector('.b-post__title h1')!.textContent!,
    original_film_name:
      document.querySelector('.b-post__origtitle')?.textContent!,
    streams: playerInfo['streams'],
  };
  const subtitleInfo: SubtitleInfo = {
    subtitle: playerInfo['subtitle'],
    subtitle_def: playerInfo['subtitle_def'],
    subtitle_lns: playerInfo['subtitle_lns'],
  };
  return [extractedInfo, subtitleInfo] as const;
}
