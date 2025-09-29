import { printLog } from '../lib/logger';
import { LogMessage } from '../lib/types';

globalThis.addEventListener('logCreate', async (event) => {
  const message = event as CustomEvent;
  await logCreate(JSON.parse(JSON.stringify(message.detail)));
});

export async function logCreate(message: LogMessage) {
  // if (message.context === 'popup') return;
  printLog(message);
  await addNewLogMessage(message);
  // TODO: Вернуть позже
  // await deleteOldLogMessage();
  return true;
}

async function addNewLogMessage(message: LogMessage) {
  // Ждём пока indexedDBObject появится, если его ещё нет
  while (typeof indexedDBObject === 'undefined') {
    await new Promise((res) => setTimeout(res, 10));
  }
  await indexedDBObject.put('logStorage', message);
}

async function deleteOldLogMessage(TTLInMs: number = 2 * 60 * 60 * 1000) {
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
