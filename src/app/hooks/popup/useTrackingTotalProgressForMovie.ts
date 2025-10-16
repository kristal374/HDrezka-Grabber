import { selectMovieInfo } from '@/app/screens/Popup/DownloadScreen/store/DownloadScreen.slice';
import { selectRange } from '@/app/screens/Popup/DownloadScreen/store/EpisodeRangeSelector.slice';
import { useAppSelector } from '@/app/screens/Popup/DownloadScreen/store/store';
import { getFromStorage } from '@/lib/storage';
import { EventType, LoadItem, MovieProgress } from '@/lib/types';
import { loadIsCompleted } from '@/lib/utils';
import equal from 'fast-deep-equal/es6';
import { useCallback, useEffect, useState } from 'react';
import browser from 'webextension-polyfill';
import { useTrackingCurrentProgress } from './useTrackingCurrentProgress';

type MovieLoadStatuses = {
  completed: number[];
  in_progress: number[];
};

export function useTrackingTotalProgressForMovie(movieId: number) {
  const movieInfo = useAppSelector(selectMovieInfo)!;
  const range = useAppSelector(selectRange);

  const [loadItem, setLoadItem] = useState<LoadItem | null>(null);
  const [loadItemIds, setLoadItemIds] = useState<number[] | null>(null);
  const [loadStatuses, setLoadStatuses] = useState<MovieLoadStatuses | null>(
    null,
  );
  const videoProgressInPercents = useTrackingCurrentProgress(loadItem);

  const completedLoads = loadStatuses?.completed.length ?? 0;
  const inProgressLoads = loadStatuses?.in_progress.length ?? 0;
  const totalLoads = completedLoads + inProgressLoads;

  const progress: MovieProgress | null =
    totalLoads > 0
      ? { videoProgressInPercents, completedLoads, totalLoads }
      : null;

  useEffect(() => {
    setup(movieId).then((result) => {
      if (result) {
        setLoadItem(result.targetDownload);
        setLoadItemIds(result.loadItemIds);
        setLoadStatuses(result.movieLoadStatuses);
      }
      eventBus.setReady();
    });
  }, [movieId]);

  useEffect(() => {
    if (!loadStatuses || totalLoads === 0 || completedLoads !== totalLoads)
      return;
    setTimeout(() => {
      setLoadItem(null);
      setLoadItemIds(null);
      setLoadStatuses(null);
    }, 3000);
  }, [loadStatuses]);

  useEffect(() => {
    const handleLocalStorageChange = async (
      changes: Record<string, browser.Storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local') return;

      for (const [key, value] of Object.entries(changes)) {
        switch (key) {
          case 'activeDownloads':
            await handleActiveDownloadsChange(
              value.oldValue as number[] | undefined,
              value.newValue as number[] | undefined,
            );
            break;
          case 'queue':
            await handleQueueChange(
              value.oldValue as QueueItem[],
              value.newValue as QueueItem[],
            );
            break;
          case 'settings':
            // ignore settings changes
            break;
          default:
            logger.warning('Unknown event type:', key);
        }
      }
    };

    eventBus.addMessageSource(
      EventType.StorageChanged,
      browser.storage.onChanged,
    );
    eventBus.on(EventType.StorageChanged, handleLocalStorageChange);

    return () => {
      eventBus.removeMessageSource(
        EventType.StorageChanged,
        browser.storage.onChanged,
      );
      eventBus.off(EventType.StorageChanged, handleLocalStorageChange);
    };
  }, [loadItem, loadItemIds, loadStatuses, range, movieInfo]);

  const handleActiveDownloadsChange = useCallback(
    async (oldValue: number[] | undefined, newValue: number[] | undefined) => {
      const newSet = new Set(newValue ?? []);
      const oldSet = new Set(oldValue ?? []);

      const added = [...newSet].filter((id) => !oldSet.has(id));
      const removed = [...oldSet].filter((id) => !newSet.has(id));

      if (!loadItemIds || !loadStatuses) {
        if (
          movieInfo.data.action === 'get_movie' ||
          (range && !Object.values(range).some((s) => s.episodes.length > 1))
        ) {
          if (added.length) await updateLoadTracking(added);
        }
        return;
      }

      const removedTouchesLoadIds = removed.some((id) =>
        loadItemIds.includes(id),
      );
      const loadItemWasRemoved = loadItem?.id && removed.includes(loadItem.id);
      const addedTouchesLoadIds = added.some((id) => loadItemIds.includes(id));
      const needUpdateLoadItem = loadItemWasRemoved || addedTouchesLoadIds;

      if (removedTouchesLoadIds) {
        setLoadStatuses(await updateAllLoadStatuses(loadItemIds));
      }

      if (!needUpdateLoadItem) return;
      const newLoadItem = await getTargetLoadItemFromActiveDownloads(
        newValue!,
        movieId,
        loadItemIds,
      );

      if (!equal(loadItem, newLoadItem)) {
        setLoadItem(newLoadItem);
      }
    },
    [loadItemIds, loadStatuses, loadItem, range, movieInfo],
  );

  const handleQueueChange = useCallback(
    async (oldValue: QueueItem[], newValue: QueueItem[]) => {
      const changes = detectQueueChanges(oldValue, newValue);

      if (changes.completed?.length && loadItemIds) {
        for (const movie of changes.completed) {
          const movieId = Array.isArray(movie) ? movie[0] : movie;
          if (loadItemIds.includes(movieId))
            setLoadStatuses(await updateAllLoadStatuses(loadItemIds));
        }
      }

      if (changes.initialized?.length && !loadItemIds) {
        await updateLoadTracking(changes.initialized);
      }
    },
    [loadItemIds],
  );

  const updateLoadTracking = useCallback(
    async (loadItemIdsSequence: QueueItem[]) => {
      for (const movie of loadItemIdsSequence ?? []) {
        const targetLoadItem = (await indexedDBObject.getFromIndex(
          'loadStorage',
          'load_id',
          Array.isArray(movie) ? movie[0] : movie,
        )) as LoadItem;

        if (targetLoadItem?.movieId === movieId) {
          const targetLoadConfig = (await indexedDBObject.getFromIndex(
            'loadConfig',
            'load_item_ids',
            targetLoadItem.id,
          ))!;
          const newLoadStatuses = await updateAllLoadStatuses(
            targetLoadConfig.loadItemIds,
          );

          setLoadItemIds(targetLoadConfig.loadItemIds);
          setLoadStatuses(newLoadStatuses);
          setLoadItem(targetLoadItem);
        }
      }
    },
    [],
  );

  return progress;
}

async function setup(movieId: number) {
  const activeDownloads = await getFromStorage<number[]>('activeDownloads');

  if (!activeDownloads) return null;
  const targetDownload = await getTargetLoadItemFromActiveDownloads(
    activeDownloads,
    movieId,
  );

  if (!targetDownload) return null;
  const targetLoadConfig = (await indexedDBObject.getFromIndex(
    'loadConfig',
    'load_item_ids',
    targetDownload.id,
  ))!;

  const loadItemIds = targetLoadConfig.loadItemIds;
  const movieLoadStatuses = await updateAllLoadStatuses(loadItemIds);
  return { targetDownload, loadItemIds, movieLoadStatuses };
}

async function updateAllLoadStatuses(downloadItemIds: number[]) {
  const range = IDBKeyRange.bound(
    Math.min(...downloadItemIds),
    Math.max(...downloadItemIds),
  );
  const downloadItems = (await indexedDBObject.getAllFromIndex(
    'loadStorage',
    'load_id',
    range,
  )) as LoadItem[];
  return await getLoadStatuses(downloadItems);
}

async function getLoadStatuses(downloadItems: LoadItem[]) {
  const loadStatuses: MovieLoadStatuses = {
    completed: [],
    in_progress: [],
  };
  downloadItems.forEach((item) => {
    loadIsCompleted(item.status)
      ? loadStatuses.completed.push(item.id)
      : loadStatuses.in_progress.push(item.id);
  });

  return loadStatuses;
}

type QueueItem = number | number[];
type QueueChanges = { initialized?: QueueItem[]; completed?: QueueItem[] };

function detectQueueChanges(
  oldValue: QueueItem[] | undefined,
  newValue: QueueItem[] | undefined,
): QueueChanges {
  if (oldValue === undefined) return { initialized: newValue };
  if (newValue === undefined) return { completed: oldValue };

  const usedOld = new Set<number>();
  const usedNew = new Set<number>();

  oldValue.forEach((oldItem, i) => {
    newValue.some((newItem, j) => {
      if (typeof oldItem !== typeof newItem) return false;
      const match =
        (typeof oldItem === 'number' && oldItem === newItem) ||
        (Array.isArray(oldItem) &&
          Array.isArray(newItem) &&
          isAncestor(oldItem, newItem));
      if (match) {
        usedOld.add(i);
        usedNew.add(j);
        return true;
      }
      return false;
    });
  });

  const completed = oldValue.filter((_, i) => !usedOld.has(i));
  const initialized = newValue.filter((_, i) => !usedNew.has(i));

  const result: QueueChanges = {};
  if (initialized.length) result.initialized = initialized;
  if (completed.length) result.completed = completed;
  return result;
}

function isAncestor(oldArr: number[], newArr: number[]): boolean {
  if (newArr.length > oldArr.length) return false;
  const offset = oldArr.length - newArr.length;
  return newArr.every((val, idx) => oldArr[offset + idx] === val);
}

async function getTargetLoadItemFromActiveDownloads(
  activeDownloads: number[],
  movieId: number,
  loadItemIds?: number[],
) {
  let targetDownload: LoadItem | null = null;
  if (!loadItemIds) {
    const loadItems = (await Promise.all(
      activeDownloads.map((id) =>
        indexedDBObject.getFromIndex('loadStorage', 'load_id', id),
      ),
    )) as LoadItem[];
    const matchingDownloads = loadItems.filter(
      (item) => item.movieId === movieId,
    );
    if (matchingDownloads.length !== 0) targetDownload = matchingDownloads[0];
  } else {
    const matchingDownloadIds = activeDownloads.filter((id) =>
      loadItemIds.includes(id),
    );

    if (matchingDownloadIds.length !== 0) {
      targetDownload = (await indexedDBObject.getFromIndex(
        'loadStorage',
        'load_id',
        matchingDownloadIds[0],
      )) as LoadItem;
    }
  }
  return targetDownload;
}
