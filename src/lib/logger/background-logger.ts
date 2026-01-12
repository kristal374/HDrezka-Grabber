import { LogMessage, printLog } from '@/lib/logger';

const pendingUpdates: LogMessage[] = [];
let debounceTimer: NodeJS.Timeout | null = null;

export function logCreate(message: LogMessage) {
  saveLogToDB(message);
  return true;
}

function saveLogToDB(data: LogMessage) {
  // Функция для динамического сохранения данных в хранилище, с возможностью
  // накопления изменений для уменьшения нагрузки на хранилище
  pendingUpdates.push(data);

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    const snapshot = [...pendingUpdates].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    pendingUpdates.splice(0, pendingUpdates.length);

    const tx = indexedDBObject.transaction('logStorage', 'readwrite');
    const logStorage = tx.store;
    try {
      for (const message of snapshot) {
        printLog(message);
        await logStorage.put(message);
      }
    } finally {
      debounceTimer = null;
      tx.done;
      await deleteOldLogMessage(settings.logMessageLifetime);
    }
  }, 200);
}

async function deleteOldLogMessage(
  TTLInMs: number = 2 * 60 * 60 * 1000, // 2 hours
) {
  const cutoff = Date.now() - TTLInMs;

  const tx = indexedDBObject.transaction('logStorage', 'readwrite');
  const index = tx.store.index('timestamp');

  const range = IDBKeyRange.upperBound(cutoff);
  let cursor = await index.openCursor(range);

  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}
