import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FileItem, LoadStatus, SeasonsWithEpisodesList } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sliceSeasons(
  seasons: SeasonsWithEpisodesList,
  seasonFrom: string,
  episodeFrom: string,
  seasonTo: string | '-1' | '-2',
  episodeTo: string | '',
): SeasonsWithEpisodesList {
  const sortedSeasonKeys = Object.keys(seasons).sort(
    (a, b) => parseInt(a) - parseInt(b),
  );
  if (parseInt(seasonTo) < 0) {
    seasonTo =
      seasonTo === '-2'
        ? sortedSeasonKeys[sortedSeasonKeys.length - 1]
        : seasonFrom;
    episodeTo = '';
  }

  const result: SeasonsWithEpisodesList = {};

  for (const seasonKey of sortedSeasonKeys) {
    if (
      parseInt(seasonKey) < parseInt(seasonFrom) ||
      parseInt(seasonKey) > parseInt(seasonTo)
    ) {
      continue;
    }

    const { title, episodes } = seasons[seasonKey];
    let slicedEpisodes = [...episodes].sort(
      (a, b) => parseInt(a.id) - parseInt(b.id),
    );

    if (seasonKey === seasonFrom) {
      slicedEpisodes = slicedEpisodes.filter(
        (episode) => parseInt(episode.id) >= parseInt(episodeFrom),
      );
    }

    if (seasonKey === seasonTo && episodeTo !== '') {
      slicedEpisodes = slicedEpisodes.filter(
        (episode) => parseInt(episode.id) <= parseInt(episodeTo),
      );
    }

    result[seasonKey] = { title, episodes: slicedEpisodes };
  }

  return result;
}

export function hashCode(s: string): number {
  const MAX_INT32 = (1 << 31) - 1; // 2147483647
  const hash = s.split('').reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a | 0;
  }, 0);
  return Math.abs(hash) % MAX_INT32;
}

export function loadIsCompleted(status: LoadStatus) {
  return [
    LoadStatus.InitiationError,
    LoadStatus.StoppedByUser,
    LoadStatus.DownloadFailed,
    LoadStatus.DownloadSuccess,
  ].includes(status);
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

export async function getActiveFileItem(activeDownloads: readonly number[]) {
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
