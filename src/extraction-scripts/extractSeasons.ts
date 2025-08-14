import { PageType, SeasonsWithEpisodesList } from '../lib/types';

export async function getSeasons(tabId: number, pageType: PageType) {
  if (pageType !== 'SERIAL') return null;
  return await browser.scripting
    .executeScript({
      target: { tabId },
      func: extractSeasons,
    })
    .then((response) => {
      return response[0].result as SeasonsWithEpisodesList;
    });
}

async function extractSeasons() {
  const seasons: SeasonsWithEpisodesList = {};

  const episodeTabs = document.getElementById('simple-episodes-tabs');
  if (!episodeTabs) return null;

  const seasonList: HTMLCollection = episodeTabs.getElementsByClassName(
    'b-simple_episodes__list',
  );

  for (let i = 0; i < seasonList.length; i++) {
    const episodeItems = seasonList[i].getElementsByClassName(
      'b-simple_episode__item',
    );
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
