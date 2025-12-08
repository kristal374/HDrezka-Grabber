import '@/lib/global-scope-init';
import { logCreate } from '@/lib/logger/background-logger';

import { doDatabaseStuff } from '@/lib/idb-storage';
import { isFirstRunExtension } from '@/lib/on-extension-start';
import { getSettings } from '@/lib/storage';
import { EventType, Message, Settings } from '@/lib/types';
import { clearCache } from '@/service-worker/cache';
import { updateVideoInfo } from '@/service-worker/response-parser';
import type { Runtime } from 'webextension-polyfill';
import { DownloadManager } from './load-manager/core';
import { fetchUrlSizes } from './network-layer';

type MessageSender = Runtime.MessageSender;

let downloadManager: DownloadManager;

async function main() {
  logger.info('Service worker starts...');

  eventBus.addMessageSource(
    EventType.NewMessageReceived,
    browser.runtime.onMessage,
  );
  eventBus.addMessageSource(
    EventType.StorageChanged,
    browser.storage.onChanged,
  );
  eventBus.addMessageSource(EventType.LogCreate, globalThis);
  eventBus.addMessageSource(EventType.ScheduleEvent, browser.alarms.onAlarm);
  eventBus.addMessageSource(
    EventType.DownloadEvent,
    browser.downloads.onChanged,
  );
  eventBus.addMessageSource(
    EventType.DownloadCreated,
    browser.downloads.onCreated,
  );

  globalThis.indexedDBObject = await doDatabaseStuff();
  globalThis.settings = await getSettings();
  downloadManager = await DownloadManager.build();
  await onStartup();

  eventBus.on(EventType.NewMessageReceived, messageHandler);
  eventBus.on(
    EventType.DownloadEvent,
    downloadManager.handleDownloadEvent.bind(downloadManager),
  );
  eventBus.on(
    EventType.DownloadCreated,
    downloadManager.handleCreateEvent.bind(downloadManager),
  );
  eventBus.on(EventType.ScheduleEvent, async (alarm) => {
    if (alarm.name.startsWith('repeat-download-')) {
      const [_matchString, loadItemId, targetFileId] = alarm.name.match(
        /repeat-download-(\d+)-(\d+)/,
      )!;
      await downloadManager.executeRetry(
        Number(loadItemId),
        Number(targetFileId),
      );
    }
  });

  eventBus.on(EventType.LogCreate, async (message) => {
    await logCreate(
      JSON.parse(JSON.stringify((message as CustomEvent).detail)),
    );
  });

  eventBus.on(EventType.StorageChanged, async (changes, areaName) => {
    if (areaName !== 'local') return;
    for (const [key, value] of Object.entries(changes)) {
      if (key === 'settings') {
        globalThis.settings =
          (value.newValue as Settings | undefined) ?? (await getSettings());
      }
    }
  });

  if (settings.trackEventsOnDeterminingFilename) {
    // @ts-ignore
    browser.downloads.onDeterminingFilename?.addListener(
      // Когда начинается загрузка "рекомендует" имя для загружаемого файла.
      // Актуально только для chrome и реализовано исключительно во избежание
      // конфликтов с другими расширениями, которые могут назначать имена файлов.
      downloadManager.handleDeterminingFilenameEvent.bind(downloadManager),
    );
  }

  logger.info('Service worker is ready.');

  eventBus.setReady();
}

async function onStartup() {
  if (await isFirstRunExtension()) {
    await clearCache();
    await downloadManager.stabilizeInsideState();
  }
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
      return await fetchUrlSizes(data.message);
    case 'updateVideoInfo':
      return await updateVideoInfo(data.message);
    case 'trigger':
      return await downloadManager.initNewDownload(data.message);
    default:
      logger.warning(message);
      return false;
  }
}

const handleError = async (originalError: Error) => {
  console.error(originalError.toString());
  logger.critical(originalError.toString());
};

main().catch(handleError);
self.addEventListener('unhandledrejection', (e) => handleError(e.reason));

// TODO: пофиксить выбор озвучки
