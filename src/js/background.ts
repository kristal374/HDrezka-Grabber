import browser from 'webextension-polyfill';
import { Logger, printLog } from '../lib/logger';
import { LoadManager } from './LoadManager';
import {
  ActualVideoData,
  DataForUpdate,
  Initiator,
  LogMessage,
  Message,
  ResponseVideoData,
  Seasons,
} from '../lib/types';
import { getQualityFileSize, updateVideoData } from './handler';

const logger = new Logger('/src/js/background.js.map');
const loadManager = new LoadManager();
let logContainer: LogMessage[] = [];

browser.runtime.onMessage.addListener(
  async (message, _sender, _sendResponse) => {
    const data = message as Message<any>;

    switch (data.type) {
      case 'logCreate':
        return await logCreate(data.message);
      case 'getFileSize':
        return await getQualityFileSize(data.message);
      case 'updateVideoInfo':
        return await updateVideoInfo(data.message);
      case 'trigger':
        return await triggerEvent(data.message);
      default:
        logger.warning(message);
    }
  },
);

globalThis.addEventListener('logCreate', async (event) => {
  const message = event as CustomEvent;
  await logCreate(message.detail);
});

async function logCreate(message: LogMessage) {
  logContainer.push(message);
  printLog(message);
  return true;
}

async function triggerEvent(message: Initiator) {
  return await loadManager.init_new_load(message);
}

async function extractSeasons(seasons: string) {
  const seasonsStorage: Seasons = {};
  const seasonsList = seasons!
    .split('</li>')
    .filter((item) => item.trim() !== '');
  seasonsList.forEach((line) => {
    const [_, seasonID, seasonTitle] = line.match(/data-tab_id="(\d+)">(.*)$/);
    seasonsStorage[seasonID] = { title: seasonTitle, episodes: [] };
  });
  return seasonsStorage;
}

async function extractAllEpisodes(serverResponse: ResponseVideoData) {
  const seasonsStorage: Seasons = await extractSeasons(serverResponse.seasons!);

  let episodesBlock = serverResponse
    .episodes!.split(`</ul>`)
    .filter((item) => item.trim() !== '');

  episodesBlock.forEach((block) => {
    const episodesList = block
      .split(`</li>`)
      .filter((item) => item.trim() !== '');
    episodesList.forEach((line) => {
      const [_, seasonID, episodeId, EpisodeTitle] = line.match(
        /data-season_id="(\d+)" data-episode_id="(\d+)">(.*)$/,
      );
      seasonsStorage[seasonID].episodes.push({
        id: episodeId,
        title: EpisodeTitle,
      });
    });
  });
  return seasonsStorage;
}

async function updateVideoInfo(data: DataForUpdate): Promise<ActualVideoData> {
  const serverResponse = await updateVideoData(data.siteURL, data.movieData);
  return {
    seasons: serverResponse?.seasons
      ? await extractAllEpisodes(serverResponse)
      : null,
    subtitle: {
      subtitle: serverResponse.subtitle,
      subtitle_def: serverResponse.subtitle_def,
      subtitle_lns: serverResponse.subtitle_lns,
    },
    streams: serverResponse.url,
  };
}
