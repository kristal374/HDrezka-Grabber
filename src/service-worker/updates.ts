import { Settings } from '@/lib/types';
import { compareVersions } from '@/lib/utils';
import { getDownloadManager } from '@/service-worker/load-manager/constructor';
import { clearCache } from '@/service-worker/network-layer';
import { Runtime } from 'webextension-polyfill';

type OnInstalledDetailsType = Runtime.OnInstalledDetailsType;

export async function onInstalledHandler(details: OnInstalledDetailsType) {
  logger.info('Event onInstalled called:', details);
  const nextVersion = browser.runtime.getManifest().version;

  if (details.previousVersion === nextVersion) {
    logger.debug('The extension has already been updated.');
    return;
  }

  if (details.reason === 'install') {
    await browser.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    const needUpdate = (version?: string) =>
      !version || compareVersions(details.previousVersion!, version) === -1;

    if (needUpdate('1.0.0.57')) await migrateToV1_0_0_57();
    if (needUpdate('1.0.0.59')) await migrateToV1_0_0_59();
    if (needUpdate()) await migrateToNextVersion(nextVersion);
  }
}

async function migrateToV1_0_0_57() {
  // Первый релиз версии 1.0.0
  logger.debug('Update to version 1.0.0.57');
  await browser.storage.local.clear();
}

async function migrateToV1_0_0_59() {
  // Обновление после сбоя декодирования ссылок, у пользователей
  // могут оставаться поломанные загрузки в хранилище расширения

  logger.debug('Update to version 1.0.0.59');
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

async function migrateToNextVersion(nextVersion: string) {
  logger.debug(`Update to version ${nextVersion}`);

  await browser.storage.session.clear();
  await clearCache({ logger });
}
