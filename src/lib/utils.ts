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