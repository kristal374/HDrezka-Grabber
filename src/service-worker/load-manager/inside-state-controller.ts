import { Logger } from '@/lib/logger';
import { getFromStorage } from '@/lib/storage';
import { FileItem, LoadItem, LoadStatus } from '@/lib/types';

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

async function groupDownloadsByLoadItemId(items: FileItem[]) {
  const groupedItems: Record<number, FileItem[]> = {};
  for (const item of items) {
    if (!groupedItems[item.relatedLoadItemId])
      groupedItems[item.relatedLoadItemId] = [];
    groupedItems[item.relatedLoadItemId].push(item);
  }
  return groupedItems;
}

function sortChain(items: FileItem[]) {
  const map = new Map(items.map((i) => [i.id, i]));
  const referenced = new Set(items.map((i) => i.dependentFileItemId));

  let cur = items.find((i) => !referenced.has(i.id));
  const result = [];

  while (cur) {
    result.push(cur);
    if (cur.dependentFileItemId === null) break;
    cur = map.get(cur.dependentFileItemId);
  }

  return result;
}

export async function findSomeFilesFromLoadItemIdsInDB(ids: readonly number[]) {
  const fileItemArray: FileItem[] = [];

  if (ids.length === 0) return fileItemArray;

  const fileStorage = indexedDBObject.transaction('fileStorage');

  let cursor = await fileStorage.store.openCursor();
  while (cursor) {
    const item = cursor.value as FileItem;
    if (ids.includes(item.relatedLoadItemId)) fileItemArray.push(item);
    cursor = await cursor.continue();
  }

  return fileItemArray;
}

export async function getActiveFileItem(
  activeDownloads: readonly number[],
): Promise<FileItem[]> {
  const extensionActiveDownloads =
    await findSomeFilesFromLoadItemIdsInDB(activeDownloads);

  // Группируем наши загрузки по relatedLoadItemId, т.к. несколько FileItem
  // могут ссылаться на один и тот же LoadItem, но при этом загружаться
  // может только один FileItem единовременно
  const groupedDownloads = await groupDownloadsByLoadItemId(
    extensionActiveDownloads,
  );

  // Убираем лишние FileItem - это либо полностью загруженные файлы, либо файлы,
  // имеющие статус DownloadCandidate, оставляем при этом файлы, которые прямо
  // сейчас находятся в обработке у расширения
  return Object.values(groupedDownloads).map((fileItems) => {
    const sortedFileItems = sortChain(fileItems);
    return sortedFileItems.filter((currentFile, index) => {
      // Если у файла нет dependentFileItemId, значит это последний файл
      // в цепочке, а если мы дошли до последнего файла в цепочке,
      // значит это целевой файл
      if (!currentFile.dependentFileItemId) return true;

      // Если у следующего в цепочке файла статус DownloadCandidate,
      // значит текущий файл либо загружается, либо уже загружен,
      // но статус не успел обновиться, и значит текущий файл - целевой
      const nextFile = sortedFileItems[index + 1];
      return nextFile!.status === LoadStatus.DownloadCandidate;
    })[0];
  });
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
