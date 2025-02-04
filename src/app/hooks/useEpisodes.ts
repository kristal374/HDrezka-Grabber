import { useEffect } from 'react';
import { Seasons } from '../../lib/types';
import { useInitData } from '../providers/InitialDataProvider';
import { useStorage } from './useStorage';

export function useEpisodes() {
  const { tabId, pageType } = useInitData();
  const [seasons, setSeasons] = useStorage<Seasons | null>('seasons', null);

  useEffect(() => {
    if (pageType !== 'SERIAL') return;

    browser.scripting
      .executeScript({
        target: { tabId },
        func: extractSeasons,
      })
      .then((response) => {
        const result = response[0].result as Seasons;
        // logger.debug(result);
        setSeasons(result);
      });
  }, []);

  return [seasons, setSeasons] as const;
}

async function extractSeasons() {
  const seasons: Seasons = {};

  const episodeTabs = document.getElementById('simple-episodes-tabs');
  if (!episodeTabs) return null;

  const seasonList: HTMLCollection = episodeTabs.getElementsByTagName('ul');

  for (let i = 0; i < seasonList.length; i++) {
    const episodeItems = seasonList[i].getElementsByTagName('li');
    for (let j = 0; j < episodeItems.length; j++) {
      const episodeID = episodeItems[j].getAttribute('data-episode_id');
      const seasonID = episodeItems[j].getAttribute('data-season_id');
      if (seasonID === null || episodeID === null) continue;
      if (!seasons.hasOwnProperty(seasonID)) {
        const element = document.querySelector(`[data-tab_id="${seasonID}"]`);
        seasons[seasonID] = {
          title: element!.textContent || `Сезон ${seasonID}`,
          episodes: [],
        };
      }
      const episodeTitle = episodeItems[j].textContent || episodeID;
      seasons[seasonID].episodes.push({
        title: episodeTitle,
        id: episodeID,
      });
    }
  }
  return seasons;
}
