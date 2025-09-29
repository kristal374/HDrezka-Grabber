import '../lib/global-scope-init';

import {
  ActualVideoData,
  DataForUpdate,
  EventType,
  Message,
  ResponseVideoData,
  SeasonsWithEpisodesList,
  SubtitleInfo,
} from '../lib/types';
import { logCreate } from './background-logger';

import type { Runtime } from 'webextension-polyfill';
import { doDatabaseStuff } from '../lib/idb-storage';
import { getQualityFileSize, updateVideoData } from './handler';
import { DownloadManager } from './load-manager/core';
type MessageSender = Runtime.MessageSender;

let downloadManager: DownloadManager;

async function main() {
  logger.info('Service worker starts...');

  eventBus.addMessageSource(
    EventType.NewMessageReceived,
    browser.runtime.onMessage,
  );

  eventBus.addMessageSource(
    EventType.BrowserStartup,
    browser.runtime.onStartup,
  );
  eventBus.addMessageSource(
    EventType.DownloadEvent,
    browser.downloads.onChanged,
  );
  eventBus.addMessageSource(
    EventType.DownloadCreated,
    browser.downloads.onCreated,
  );

  globalThis.indexedDBObject = await doDatabaseStuff();
  downloadManager = await DownloadManager.build();

  eventBus.on(EventType.NewMessageReceived, messageHandler);

  eventBus.on(
    EventType.BrowserStartup,
    downloadManager.stabilizeInsideState.bind(downloadManager),
  );
  eventBus.on(
    EventType.DownloadEvent,
    downloadManager.handlerDownloadEvent.bind(downloadManager),
  );
  eventBus.on(
    EventType.DownloadCreated,
    downloadManager.handlerCreated.bind(downloadManager),
  );

  // @ts-ignore
  browser.downloads.onDeterminingFilename?.addListener(
    // Когда начинается загрузка "рекомендует" имя для загружаемого файла.
    // Актуально только для chrome и реализовано исключительно во избежание
    // конфликтов с другими расширениями, которые могут назначать имена файлов.
    downloadManager.handlerDeterminingFilename.bind(downloadManager),
  );

  logger.info('Service worker is ready.');

  eventBus.setReady();
}

async function messageHandler(
  message: unknown,
  _sender: MessageSender,
  _sendResponse: (message: unknown) => void,
) {
  const data = message as Message<any>;

  switch (data.type) {
    case 'logCreate':
      return await logCreate(data.message);
    case 'getFileSize':
      return await getQualityFileSize(data.message);
    case 'updateVideoInfo':
      return await updateVideoInfo(data.message);
    case 'trigger':
      return await downloadManager.initNewDownload(data.message);
    default:
      logger.warning(message);
      return false;
  }
}

async function extractSeasons(seasons: string) {
  const seasonsStorage: SeasonsWithEpisodesList = {};
  const seasonsList = seasons!
    .split('</li>')
    .filter((item) => item.trim() !== '');
  seasonsList.forEach((line) => {
    const [_, seasonID, seasonTitle] = line.match(/data-tab_id="(\d+)">(.*)$/)!;
    seasonsStorage[seasonID] = { title: seasonTitle, episodes: [] };
  });
  return seasonsStorage;
}

async function extractAllEpisodes(serverResponse: ResponseVideoData) {
  const seasonsStorage: SeasonsWithEpisodesList = await extractSeasons(
    serverResponse.seasons!,
  );

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
      )!;
      seasonsStorage[seasonID].episodes.push({
        id: episodeId,
        title: EpisodeTitle,
      });
    });
  });
  return seasonsStorage;
}

async function updateVideoInfo(data: DataForUpdate): Promise<ActualVideoData> {
  logger.debug('Request to update video data:', data);
  const serverResponse = await updateVideoData(data.siteURL, data.movieData);
  return {
    seasons: serverResponse?.seasons
      ? await extractAllEpisodes(serverResponse)
      : null,
    subtitle: {
      subtitle: serverResponse.subtitle,
      subtitle_def: serverResponse.subtitle_def,
      subtitle_lns: serverResponse.subtitle_lns,
    } as SubtitleInfo,
    streams: serverResponse.url,
  };
}

const handleError = async (originalError: Error) => {
  logger.critical(originalError.toString());
};

main().catch(handleError);
self.addEventListener('unhandledrejection', (e) => handleError(e.reason));

// TODO: добавить кэш
// TODO: пофиксить выбор озвучки
