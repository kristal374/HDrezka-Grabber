import '@/lib/global-scope-init';

import { doDatabaseStuff, dropDatabase } from '@/lib/idb-storage';
import { Logger, LogMessage } from '@/lib/logger';
import { clearDebounceTimer, logCreate } from '@/lib/logger/background-logger';
import { LoggerEventType } from '@/lib/logger/types';
import { getTraceId } from '@/lib/logger/utils';
import { getSettings } from '@/lib/storage';
import { EventType, Message, Settings } from '@/lib/types';
import {
  abortAllFetches,
  clearCache,
  getOriginalUrlItem,
  stopAllVideoReader,
  updateVideoInfo,
} from '@/service-worker/network-layer';
import { Alarms, Runtime, Storage } from 'webextension-polyfill';
import { DownloadManager } from './load-manager/core';

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

  eventBus.mountHandler(EventType.DBDeletedEvent, globalThis, restoreDB);

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
    promise.then((response) => sendResponse(response));
    return true;
  };

  const data = message as Message<any>;
  switch (data.type) {
    case 'getFileSize':
      return promiseResponse(
        getOriginalUrlItem({ request: data.message, logger }),
      );
    case 'updateVideoInfo':
      return promiseResponse(updateVideoInfo({ data: data.message, logger }));
    case 'trigger':
      return promiseResponse(
        downloadManager.initNewDownload({
          initiator: data.message,
          logger,
        }),
      );
    case 'requestToRestoreState':
      return promiseResponse(
        downloadManager.stabilizeInsideState({
          permissionToRestore: data.message,
          logger,
        }),
      );
    case 'clearCache':
      return promiseResponse(clearCache({ logger }));
    case 'stopAllDownloads':
      return promiseResponse(downloadManager.cancelAllDownload({ logger }));
    case 'DBDeleted':
      return promiseResponse(restoreDB());
    case 'deleteExtensionData':
      return promiseResponse(clearExtensionData({ logger }));
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
  const newLogMessageHandler = (message: unknown, _port: Port) => {
    return logCreate(message as LogMessage);
  };

  const disconnectHandler = () => {
    port.onMessage.removeListener(newLogMessageHandler);
    port.onDisconnect.removeListener(disconnectHandler);
  };

  port.onMessage.addListener(newLogMessageHandler);
  port.onDisconnect.addListener(disconnectHandler);
}

async function newLogHandler(message: Event) {
  // Мы должны привести объект к виду, в котором мы сможем сохранить его в БД.
  // JSON, это самый простой, хоть и не самый эффективный способ
  logCreate(JSON.parse(JSON.stringify((message as CustomEvent).detail)));
}

async function restoreDB() {
  globalThis.indexedDBObject = await doDatabaseStuff();
}

async function clearExtensionData({
  logger = globalThis.logger,
}: {
  logger?: Logger;
}) {
  // Отключаем на время получение любых сообщений чтоб не нарушить состояние
  eventBus.off(EventType.NewMessageReceived, messageHandler);

  await downloadManager.cancelAllDownload({ logger });

  // Прерываем активные запросы, иначе могут возникнуть ошибки после удаления БД
  abortAllFetches();
  stopAllVideoReader();

  // Ждём 3 секунды чтоб усели обработаться все события в downloadManager
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Очищаем на всякий случай логи ожидающие записи
  clearDebounceTimer();

  await browser.storage.local.clear();
  await browser.storage.sync.clear();
  await browser.storage.session.clear();
  await dropDatabase();

  // Рассылаем уведомления о том, что база данных удалена и её необходимо пересоздать
  await browser.runtime
    .sendMessage<Message<undefined>>({
      type: 'DBDeleted',
      message: undefined,
    })
    .catch(() => {});
  await restoreDB();

  // Не забываем снова подписаться на новые уведомления
  eventBus.on(EventType.NewMessageReceived, messageHandler);
  return true;
}

const handleError = async (originalError: Error) => {
  console.error(originalError.toString());
  logger.critical(originalError.toString());
};

self.addEventListener('unhandledrejection', (e) => handleError(e.reason));
main().catch(handleError);
