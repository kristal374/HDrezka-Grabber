import { printLog } from '../lib/logger';
import { LogMessage } from '../lib/types';

export async function logCreate(message: LogMessage) {
  printLog(message);

  await indexedDBObject.put('logStorage', message).catch(
    () => {
      // Если БД закрыта, нет смысла поднимать ошибку, просто выводим в консоль
    },
  );

  await deleteOldLogMessage(settings.logMessageLifetime);
  return true;
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
