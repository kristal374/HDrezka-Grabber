import '@/lib/global-scope-init';
import { logCreate } from '@/lib/logger/background-logger';

import { doDatabaseStuff } from '@/lib/idb-storage';
import { LogMessage } from '@/lib/logger';
import { LoggerEventType } from '@/lib/logger/types';
import { getSettings } from '@/lib/storage';
import { EventType, Message, Settings } from '@/lib/types';
import { getTraceId } from '@/lib/utils';
import { updateVideoInfo } from '@/service-worker/response-parser';
import type { Runtime } from 'webextension-polyfill';
import { DownloadManager } from './load-manager/core';
import { fetchUrlSizes } from './network-layer';

type MessageSender = Runtime.MessageSender;

let downloadManager: DownloadManager;

async function main() {
  let logger = globalThis.logger;
  logger = logger.attachMetadata({ traceId: getTraceId() });

  logger.info('Service worker starts...');

  eventBus.mountHandler(
    LoggerEventType.LogConnect,
    browser.runtime.onConnect,
    (port) => {
      port.onMessage.addListener((message, _port) => {
        return logCreate(message as LogMessage);
      });
    },
  );

  eventBus.addMessageSource(
    EventType.NewMessageReceived,
    browser.runtime.onMessage,
  );
  eventBus.addMessageSource(
    EventType.StorageChanged,
    browser.storage.onChanged,
  );
  eventBus.addMessageSource(LoggerEventType.LogCreate, globalThis);
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
  await downloadManager.stabilizeInsideState({ logger });

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
      await downloadManager.executeRetry({
        loadItemId: Number(loadItemId),
        targetFileId: Number(targetFileId),
        logger,
      });
    }
  });

  eventBus.on(LoggerEventType.LogCreate, (message) => {
    logCreate(JSON.parse(JSON.stringify((message as CustomEvent).detail)));
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

async function messageHandler(
  message: unknown,
  _sender: MessageSender,
  _sendResponse: (message: unknown) => void,
) {
  let logger = globalThis.logger;
  logger = logger.attachMetadata({ traceId: getTraceId() });

  const data = message as Message<any>;
  switch (data.type) {
    case 'getFileSize':
      return await fetchUrlSizes({ request: data.message, logger });
    case 'updateVideoInfo':
      return await updateVideoInfo({ data: data.message, logger });
    case 'trigger':
      return await downloadManager.initNewDownload({
        initiator: data.message,
        logger,
      });
    case 'requestToRestoreState':
      return await downloadManager.stabilizeInsideState({
        permissionToRestore: data.message,
        logger,
      });
    default:
      logger.warning(message);
      return false;
  }
}

const handleError = async (originalError: Error) => {
  console.error(originalError.toString());
  logger.critical(originalError.toString());
};

self.addEventListener('unhandledrejection', (e) => handleError(e.reason));
main().catch(handleError);

// TODO: пофиксить выбор озвучки
