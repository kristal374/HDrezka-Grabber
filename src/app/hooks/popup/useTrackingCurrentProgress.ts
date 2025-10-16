import browser from 'webextension-polyfill';

import { FileItem, LoadItem } from '@/lib/types';
import { loadIsCompleted } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function useTrackingCurrentProgress(loadItem: LoadItem | null) {
  const [currentProgress, setCurrentProgress] = useState<number | null>(null);

  useEffect(() => {
    if (loadItem === null) {
      setCurrentProgress(null);
      return;
    }

    let isCancelled = false;
    const interval = setInterval(async () => {
      if (isCancelled) return;
      setCurrentProgress(await fetchProgress(loadItem.id));
    }, 150);

    return () => {
      clearInterval(interval);
      isCancelled = true;
    };
  }, [loadItem]);

  return currentProgress;
}

async function getCurrentProgress(browserDownloadId: number) {
  const downloadBrowserItems = await browser.downloads.search({
    id: browserDownloadId,
  });

  if (!downloadBrowserItems.length || !downloadBrowserItems[0].totalBytes)
    return 0;

  const currentProgress =
    downloadBrowserItems[0].bytesReceived / downloadBrowserItems[0].totalBytes;
  return Math.round(currentProgress * 1000) / 10;
}

async function getDownloadId(loadItemId: number) {
  const fileItems = (await indexedDBObject.getAllFromIndex(
    'fileStorage',
    'load_item_id',
    loadItemId,
  )) as FileItem[];

  if (fileItems.length === 0) return null;
  if (fileItems.length === 1) return fileItems[0].downloadId;

  // Отдаём приоритет файлу, что загружается первым
  // (у него будет ссылка на второй - зависимый от него файл)
  const [firstDownload, secondDownload] = fileItems[0].dependentFileItemId
    ? [fileItems[0], fileItems[1]]
    : [fileItems[1], fileItems[0]];

  // Если приоритетный файл уже завершил загрузку, то возвращаем ссылку на второй
  return loadIsCompleted(firstDownload.status)
    ? secondDownload.downloadId
    : firstDownload.downloadId;
}

function createProgressFetcher() {
  let cachedDownloadBrowserId: number | null = null;
  let lastProgress: number | null = null;
  let counter = 0;

  return async function fetchProgress(loadItemId: number | null) {
    if (!loadItemId) return null;
    const downloadBrowserId = !cachedDownloadBrowserId
      ? await getDownloadId(loadItemId)
      : cachedDownloadBrowserId;

    if (!downloadBrowserId) return null;
    if (cachedDownloadBrowserId !== downloadBrowserId) {
      cachedDownloadBrowserId = downloadBrowserId;
    }

    const currentProgress = await getCurrentProgress(downloadBrowserId);
    if (lastProgress === currentProgress) counter++;
    lastProgress = currentProgress;

    if (currentProgress === 100 || counter > 3) {
      cachedDownloadBrowserId = null;
      counter = 0;
    }
    return currentProgress;
  };
}

const fetchProgress = createProgressFetcher();

export { fetchProgress };
