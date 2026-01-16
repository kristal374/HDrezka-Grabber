import { Logger } from '@/lib/logger';
import { getFromStorage } from '@/lib/storage';
import { FileItem, LoadItem } from '@/lib/types';
import { getActiveFileItem } from '@/lib/utils';

const STORAGE_KEY = 'isFirstRun';

export async function isFirstRunExtension({
  logger = globalThis.logger,
}: {
  logger?: Logger;
}) {
  const storage = await browser.storage.session.get(STORAGE_KEY);
  const isFirstRun = (storage[STORAGE_KEY] as false | undefined) ?? true;
  logger.debug(`Extension is first run: ${isFirstRun}`);

  if (isFirstRun) {
    await browser.storage.session.set({ [STORAGE_KEY]: false });
    return isFirstRun;
  }
  return isFirstRun;
}

export async function findBrokenFileItemInActiveDownloads({
  strictMode = false,
  logger = globalThis.logger,
}: {
  strictMode: boolean;
  logger?: Logger;
}) {
  logger.info('Finding broken FileItems in active downloads.');

  const brokenDownloads: FileItem[] = [];

  // Сначала получаем объекты активных загрузок, которые отслеживает расширение
  const activeDownloads =
    (await getFromStorage<number[]>('activeDownloads')) ?? [];
  const extensionActiveFiles = await getActiveFileItem(activeDownloads);

  // Далее получаем активные загрузки браузера, что отслеживает сам браузер,
  // и отсеиваем те, которые НЕ принадлежат расширению
  const browserActiveDownloads = await browser.downloads.search({
    state: 'in_progress',
  });
  const filteredBrowserActiveDownloadsId = browserActiveDownloads
    .filter((item) => item.byExtensionId === browser.runtime.id)
    .map((item) => item.id);

  // Если у загрузки есть downloadId и её одновременно отслеживает
  // и браузер и расширение, значит загрузка корректна
  const inappropriateDownloads = extensionActiveFiles.filter(
    (item) =>
      !(
        item.downloadId &&
        filteredBrowserActiveDownloadsId.includes(item.downloadId)
      ),
  );

  // В режиме strictMode мы считаем, что любая загрузка, которая не
  // отслеживается браузером, является сломанной, это необходимо, когда
  // расширение пробуждается не в стандартном режиме, а при старте браузера,
  // когда никакие события об окончании загрузки не могли прийти априори
  if (strictMode) return inappropriateDownloads;

  // Но возможна ситуация, когда браузер уже закончил загрузку файла,
  // а расширение ещё не успело об этом узнать. Такая ситуация тоже корректна,
  // и мы должны исключить такие объекты из списка сломанных загрузок
  for (const item of inappropriateDownloads) {
    if (item.downloadId !== null) {
      const downloadObjectList = await browser.downloads.search({
        id: item.downloadId,
      });
      if (
        downloadObjectList.length > 0 &&
        downloadObjectList[0].state !== 'in_progress'
      ) {
        continue;
      }
    }
    brokenDownloads.push(item);
  }

  // TODO: если filteredBrowserActiveDownloadsId.length > activeDownloads.length,
  //  тогда внутреннее состояние так же сломано
  return brokenDownloads;
}

export async function findBrokenLoadItemInActiveDownloads({
  logger = globalThis.logger,
}: {
  logger?: Logger;
}) {
  logger.info('Finding broken LoadItems in active downloads.');

  // Сначала получаем объекты активных загрузок, которые отслеживает расширение
  const activeDownloads =
    (await getFromStorage<number[]>('activeDownloads')) ?? [];
  const extensionActiveFiles = await getActiveFileItem(activeDownloads);

  const activeLoadItemIdsSet = new Set(activeDownloads);
  const realActiveLoadItemIdsSet = new Set(
    extensionActiveFiles.map((item) => item.relatedLoadItemId),
  );
  const brokenLoadItemIds = [
    ...activeLoadItemIdsSet.difference(realActiveLoadItemIdsSet),
  ];

  const tx = indexedDBObject.transaction('loadStorage');
  const brokenDownloads = await Promise.all(
    brokenLoadItemIds.map((id) => tx.store.get(id)),
  );
  tx.done;
  return brokenDownloads as LoadItem[];
}
