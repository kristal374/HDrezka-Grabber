import { useEffect, useState } from 'react';
import { LoadConfig, LoadStatus } from '../../lib/types';

export function useTrackingProgressOfFileDownload(
  loadStatuses: Partial<Record<LoadStatus, number[]>>,
  loadConfig: LoadConfig | null,
) {
  const [fileDownloadProgress, setFileDownloadProgress] = useState<{
    completed: number | null;
    total: number | null;
  }>({
    completed: null,
    total: null,
  });

  useEffect(() => {
    setFileDownloadProgress(calculateLoadStats(loadStatuses, loadConfig));
  }, [loadStatuses]);

  return fileDownloadProgress;
}

function calculateLoadStats(
  loadStatuses: Partial<Record<LoadStatus, number[]>>,
  loadConfig: LoadConfig | null,
) {
  let completed = 0;
  let total = loadConfig?.loadItems.length ?? 0;

  Object.entries(loadStatuses).forEach(([key, value]) => {
    if (
      [
        'DownloadSuccess',
        'DownloadFailed',
        'StoppedByUser',
        'InitiationError',
      ].includes(key)
    ) {
      completed += value.length;
    }
  });

  return { completed, total };
}
