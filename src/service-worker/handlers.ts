import { doDatabaseStuff, dropDatabase } from '@/lib/idb-storage';
import {
  clearDebounceTimer,
  getTraceId,
  logCreate,
  Logger,
  LogMessage,
} from '@/lib/logger';
import { getSettings } from '@/lib/storage';
import { EventType, Message, Settings } from '@/lib/types';
import { compareVersions } from '@/lib/utils';
import { getDownloadManager } from '@/service-worker/load-manager/constructor';
import {
  abortAllFetches,
  clearCache,
  getOriginalUrlItem,
  stopAllVideoReader,
  updateVideoInfo,
} from '@/service-worker/network-layer';
import { Alarms, Runtime, Storage } from 'webextension-polyfill';

type Port = Runtime.Port;
type StorageChange = Storage.StorageChange;
type Alarm = Alarms.Alarm;
type MessageSender = Runtime.MessageSender;
type OnInstalledDetailsType = Runtime.OnInstalledDetailsType;

export function messageHandler(
  message: unknown,
  _sender: MessageSender,
  _sendResponse: (message: unknown) => void,
) {
  let logger = globalThis.logger;
  logger = logger.attachMetadata({ traceId: getTraceId() });

  const downloadManager = getDownloadManager();

  const data = message as Message<any>;
  switch (data.type) {
    case 'getFileSize':
      return getOriginalUrlItem({ request: data.message, logger });
    case 'updateVideoInfo':
      return updateVideoInfo({ data: data.message, logger });
    case 'trigger':
      return downloadManager.initNewDownload({
        initiator: data.message,
        logger,
      });
    case 'requestToRestoreState':
      return downloadManager.stabilizeInsideState({
        permissionToRestore: data.message,
        logger,
      });
    case 'clearCache':
      return clearCache({ logger });
    case 'stopAllDownloads':
      return downloadManager.cancelAllDownload({ logger });
    case 'DBDeleted':
      return restoreDBHandler();
    case 'deleteExtensionData':
      return clearExtensionData({ logger });
    default:
      logger.warning(message);
      return false;
  }
}

export async function alarmHandler(alarm: Alarm) {
  if (alarm.name.startsWith('repeat-download-')) {
    const [_matchString, loadItemId, targetFileId] = alarm.name.match(
      /repeat-download-(\d+)-(\d+)/,
    )!;

    const downloadManager = getDownloadManager();
    await downloadManager.executeRetry({
      loadItemId: Number(loadItemId),
      targetFileId: Number(targetFileId),
      logger,
    });
  }
}

export async function storageChangeHandler(
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

export async function onConnectHandler(port: Port) {
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

export async function newLogHandler(message: Event) {
  logCreate((message as CustomEvent).detail);
}

export async function restoreDBHandler() {
  globalThis.indexedDBObject = await doDatabaseStuff();
}

export async function clearExtensionData({
  logger = globalThis.logger,
}: {
  logger?: Logger;
}) {
  // Отключаем на время получение любых сообщений чтоб не нарушить состояние
  eventBus.off(EventType.NewMessageReceived, messageHandler);

  const downloadManager = getDownloadManager();
  await downloadManager.cancelAllDownload({ logger });

  // Прерываем активные запросы, иначе могут возникнуть ошибки после удаления БД
  abortAllFetches({ logger });
  stopAllVideoReader({ logger });

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
  await restoreDBHandler();

  // Не забываем снова подписаться на новые уведомления
  eventBus.on(EventType.NewMessageReceived, messageHandler);
  return true;
}

export async function errorHandler(originalError: Error) {
  console.error(originalError);
  logger.critical(originalError);
}

export async function onInstalledHandler(details: OnInstalledDetailsType) {
  logger.info('Event onInstalled called:', details);
  const currentVersion = browser.runtime.getManifest().version;

  if (details.previousVersion === currentVersion) {
    logger.debug('The extension has already been updated.');
    return;
  }

  if (details.reason === 'install') {
    await browser.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    const needUpdate = (version?: string) =>
      !version || compareVersions(version ?? '0.0.1', currentVersion) === 1;

    if (needUpdate('1.0.0.57')) {
      logger.debug('Update to version 1.0.0.57');
      await browser.storage.local.clear();
    }
    if (needUpdate()) {
      logger.debug(`Update to version ${currentVersion}`);

      // Обновление после сбоя декодирования ссылок, у пользователей
      // могут оставаться поломанные загрузки в хранилище расширения
      const downloadManager = getDownloadManager();
      await downloadManager.cancelAllDownload({ logger });
      await browser.storage.session.clear();

      if (browser.i18n.getUILanguage() === 'uk') {
        // Исправляем шаблоны имён файлов для пользователей с укр. локализацией
        const newSettings: Settings = JSON.parse(JSON.stringify(settings));
        newSettings.filenameFilmTemplate = ['%orig_title%'];
        newSettings.filenameSeriesTemplate = [
          '%orig_title%',
          ' S',
          '%season_id%',
          'E',
          '%episode_id%',
        ];
        await browser.storage.local.set({ settings: newSettings });
      }
    }
  }
}
