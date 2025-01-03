import browser from 'webextension-polyfill';
import { Logger, printLog } from '../lib/logger';
import { LoadManager } from './LoadManager';
import {
  ActualEpisodeData,
  ActualVoiceOverData,
  DataForUpdate,
  Initiator,
  LogMessage,
  Message,
  ResponseVideoData,
  Seasons,
} from '../lib/types';
import { decodeURL, getQualityFileSize, updateVideoData } from './handler';

const logger = new Logger('/src/js/background.js.map');
const loadManager = new LoadManager();
let logContainer: LogMessage[] = [];

browser.runtime.onMessage.addListener(
  async (message, _sender, _sendResponse) => {
    const data = message as Message<any>;

    switch (data.type) {
      case 'logCreate':
        return await logCreate(data.message);
      case 'decodeURL':
        return await decodeURL(data.message);
      case 'getFileSize':
        return await getQualityFileSize(data.message);
      case 'updateTranslateInfo':
        return await updateTranslateInfo(data.message);
      case 'updateEpisodesInfo':
        return await updateEpisodesInfo(data.message);
      case 'trigger':
        return await triggerEvent(data.message);
      case 'progress':
        return await eventProgress(data.message);
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

async function eventProgress(message: Message<number>) {
  return true;
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

async function updateTranslateInfo(
  data: DataForUpdate,
): Promise<ActualVoiceOverData> {
  const serverResponse = await updateVideoData(data.siteURL, data.movieData);
  return {
    seasons: await extractAllEpisodes(serverResponse),
    subtitle: {
      subtitle: serverResponse.subtitle,
      subtitle_def: serverResponse.subtitle_def,
      subtitle_lns: serverResponse.subtitle_lns,
    },
    streams: serverResponse.url,
  };
}

async function updateEpisodesInfo(
  data: DataForUpdate,
): Promise<ActualEpisodeData> {
  const serverResponse = await updateVideoData(data.siteURL, data.movieData);
  return {
    subtitle: {
      subtitle: serverResponse.subtitle,
      subtitle_def: serverResponse.subtitle_def,
      subtitle_lns: serverResponse.subtitle_lns,
    },
    streams: serverResponse.url,
  };
}
