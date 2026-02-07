import '@/lib/global-scope-init';

import { doDatabaseStuff } from '@/lib/idb-storage';
import { getTraceId, LoggerEventType } from '@/lib/logger';
import { getSettings } from '@/lib/storage';
import { EventType } from '@/lib/types';
import {
  alarmHandler,
  errorHandler,
  messageHandler,
  newLogHandler,
  onConnectHandler,
  onInstalledHandler,
  restoreDBHandler,
  storageChangeHandler,
} from '@/service-worker/handlers';
import { buildDownloadManager } from '@/service-worker/load-manager/constructor';

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
    EventType.ExtensionInstalled,
    browser.runtime.onInstalled,
    onInstalledHandler,
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

  eventBus.mountHandler(EventType.DBDeletedEvent, globalThis, restoreDBHandler);

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

  const downloadManager = await buildDownloadManager();
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

  const manifest = browser.runtime.getManifest();
  const IS_DEV = manifest.version.endsWith('.1');
  const haveDevIcon = Object.values(manifest.icons ?? {})[0].includes('dev');
  if (IS_DEV && !haveDevIcon) {
    // Устанавливаем спец. иконку, если определяем, что это дев сборка
    const browserAction = browser.browserAction ?? browser.action;
    await browserAction.setIcon({
      path: {
        '512': '/img/icons/dev/512.png',
        '256': '/img/icons/dev/256.png',
        '128': '/img/icons/dev/128.png',
        '96': '/img/icons/dev/96.png',
        '64': '/img/icons/dev/64.png',
        '48': '/img/icons/dev/48.png',
        '32': '/img/icons/dev/32.png',
        '16': '/img/icons/dev/16.png',
      },
    });
  }

  logger.info('Service worker is ready.');
}

self.addEventListener('unhandledrejection', (e) => errorHandler(e.reason));
main()
  .catch(errorHandler)
  .finally(() => eventBus.setReady());
