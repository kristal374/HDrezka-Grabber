import { DownloadManager } from '@/service-worker/load-manager/core';

function makeDownloadManager() {
  let downloadManager: DownloadManager;

  const buildDownloadManager = async () => {
    downloadManager = await DownloadManager.build();
    return downloadManager;
  };
  const getDownloadManager = () => downloadManager;
  return [buildDownloadManager, getDownloadManager] as const;
}

export const [buildDownloadManager, getDownloadManager] = makeDownloadManager();
