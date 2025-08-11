import browser from 'webextension-polyfill';

import { useEffect, useRef, useState } from 'react';
import { getFromStorage } from '../../lib/storage';
import { LoadItem } from '../../lib/types';

export function useTrackingCurrentProgress(loadItemId: number | null) {
  const [currentProgress, setCurrentProgress] = useState<number | null>(null);
  const loadItem = useRef<LoadItem | null>(null);

  useEffect(() => {
    if (loadItemId === null) {
      setCurrentProgress(null);
      loadItem.current = null;
      return;
    }

    let isCancelled = false;
    const interval = setInterval(async () => {
      if (isCancelled) return;
      setCurrentProgress(await fetchProgress(loadItemId));
    }, 150);

    return () => {
      clearInterval(interval);
      isCancelled = true;
    };
  }, [loadItemId]);

  return { current: currentProgress };
}

async function getLoadItem(loadItemId: number) {
  const loadItem = await getFromStorage<LoadItem>(`d-${loadItemId}`);
  return loadItem ?? null;
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

function createProgressFetcher() {
  let cachedLoadItem: LoadItem | null = null;

  return async function fetchProgress(loadItemId: number | null) {
    if (!loadItemId) return null;
    if (!cachedLoadItem?.file.downloadId || loadItemId !== cachedLoadItem?.uid)
      cachedLoadItem = await getLoadItem(loadItemId);
    const downloadBrowserId = cachedLoadItem?.file.downloadId ?? null;

    if (!downloadBrowserId) return null;
    return await getCurrentProgress(downloadBrowserId);
  };
}

const fetchProgress = createProgressFetcher();

export { fetchProgress };
