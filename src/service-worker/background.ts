import '@/lib/global-scope-init';

import { doDatabaseStuff } from '@/lib/idb-storage';
import { LogMessage } from '@/lib/logger';
import { logCreate } from '@/lib/logger/background-logger';
import { LoggerEventType } from '@/lib/logger/types';
import { getTraceId } from '@/lib/logger/utils';
import { getSettings } from '@/lib/storage';
import { EventType, Message, Settings } from '@/lib/types';
import { updateVideoInfo } from '@/service-worker/response-parser';
import { Alarms, Runtime, Storage } from 'webextension-polyfill';
import { DownloadManager } from './load-manager/core';
import { fetchUrlSizes } from './network-layer';

type Port = Runtime.Port;
type StorageChange = Storage.StorageChange;
type Alarm = Alarms.Alarm;
type MessageSender = Runtime.MessageSender;

let downloadManager: DownloadManager;

async function main() {
  let logger = globalThis.logger;
  logger = logger.attachMetadata({ traceId: getTraceId() });

  logger.info('Service worker starts...');

  eventBus.mountHandler(
    LoggerEventType.LogConnect,
    browser.runtime.onConnect,
    onConnectHandler,
  );

  eventBus.mountHandler(
    EventType.NewMessageReceived,
    browser.runtime.onMessage,
    messageHandler,
  );

  eventBus.mountHandler(
    EventType.ScheduleEvent,
    browser.alarms.onAlarm,
    alarmHandler,
  );

  eventBus.mountHandler(
    EventType.StorageChanged,
    browser.storage.onChanged,
    storageChangeHandler,
  );

  eventBus.mountHandler(LoggerEventType.LogCreate, globalThis, newLogHandler);

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

  eventBus.on(
    EventType.DownloadEvent,
    downloadManager.handleDownloadEvent.bind(downloadManager),
  );
  eventBus.on(
    EventType.DownloadCreated,
    downloadManager.handleCreateEvent.bind(downloadManager),
  );

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

function messageHandler(
  message: unknown,
  _sender: MessageSender,
  sendResponse: (message: unknown) => void,
) {
  let logger = globalThis.logger;
  logger = logger.attachMetadata({ traceId: getTraceId() });
  const promiseResponse = <T>(promise: Promise<T>) => {
    promise.then((response) => sendResponse(response))
    return true
  }

  const data = message as Message<any>;
  switch (data.type) {
    case 'getFileSize':
      return promiseResponse(fetchUrlSizes({ request: data.message, logger }));
    case 'updateVideoInfo':
      return promiseResponse(updateVideoInfo({ data: data.message, logger }));
    case 'trigger':
      return promiseResponse(downloadManager.initNewDownload({
        initiator: data.message,
        logger,
      }));
    case 'requestToRestoreState':
      return promiseResponse(downloadManager.stabilizeInsideState({
        permissionToRestore: data.message,
        logger,
      });
    default:
      logger.warning(message);
      return false;
  }
}

async function alarmHandler(alarm: Alarm) {
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
}

async function storageChangeHandler(
  changes: Record<string, StorageChange>,
  areaName: string,
) {
  if (areaName !== 'local') return;
  for (const [key, value] of Object.entries(changes)) {
    if (key === 'settings') {
      globalThis.settings =
        (value.newValue as Settings | undefined) ?? (await getSettings());
    }
  }
}

async function onConnectHandler(port: Port) {
  port.onMessage.addListener((message, _port) => {
    return logCreate(message as LogMessage);
  });
}

async function newLogHandler(message: Event) {
  // Мы должны привести объект к виду, в котором мы сможем сохранить его в БД.
  // JSON, это самый простой, хоть и не самый эффективный способ
  logCreate(JSON.parse(JSON.stringify((message as CustomEvent).detail)));
}

const handleError = async (originalError: Error) => {
  console.error(originalError.toString());
  logger.critical(originalError.toString());
};

self.addEventListener('unhandledrejection', (e) => handleError(e.reason));
main().catch(handleError);

// TODO: пофиксить выбор озвучки
