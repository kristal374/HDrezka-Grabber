import { PageType, Seasons } from '../../lib/types';
import { useEffect, useState } from 'react';
import { useTabID } from '../providers/CurrentTabProvider';

export function useEpisodes(pageType: PageType) {
  const tabID = useTabID();
  const [seasons, setSeasons] = useState<Seasons | null>(null);

  useEffect(() => {
    if (!tabID || pageType !== 'SERIAL') return;

    browser.scripting
      .executeScript({
        target: { tabId: tabID },
        func: extractSeasons,
      })
      .then((response) => {
        const result = response[0].result as Seasons;
        // logger.debug(result);
        setSeasons(result);
      });
  }, [tabID, pageType]);

  return seasons;
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
