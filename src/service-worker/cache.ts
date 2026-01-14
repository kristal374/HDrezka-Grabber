import { Logger } from '@/lib/logger';

export async function getFromCache<T>({
  url,
  body,
  logger = globalThis.logger,
}: {
  url: string;
  body?: string;
  logger?: Logger;
}) {
  await deleteOldCacheItems();

  const key = `${url}${body ? `-${body}` : ''}`;
  const cacheItem = await indexedDBObject.getFromIndex(
    'cacheStorage',
    'key',
    key,
  );

  if (!cacheItem) return null;
  logger.debug(`Restored from cache:`, cacheItem);
  return cacheItem.data as T;
}

export async function setInCache<T>({
  data,
  url,
  body,
  logger = globalThis.logger,
}: {
  data: T;
  url: string;
  body?: string;
  logger?: Logger;
}) {
  const key = `${url}${body ? `-${body}` : ''}`;
  logger.debug(`Saving to cache:`, { key, data });
  const timeOfDeath = new Date().getTime() + 15 * 60 * 1000; // 15 minutes
  await indexedDBObject.put('cacheStorage', { timeOfDeath, key, data });
}

async function deleteOldCacheItems() {
  const currentTime = new Date().getTime();
  const tx = indexedDBObject.transaction('cacheStorage', 'readwrite');
  const index = tx.store.index('time_of_death');

  const range = IDBKeyRange.upperBound(currentTime);
  let cursor = await index.openCursor(range);

  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function clearCache({
  logger = globalThis.logger,
}: {
  logger?: Logger;
}) {
  logger.info('Clearing cache.');
  await indexedDBObject.clear('cacheStorage');
}
