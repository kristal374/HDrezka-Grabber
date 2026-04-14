import { getQualityWeight, parseQuality } from '@/lib/link-processing';
import { LogMessage } from '@/lib/logger';
import {
  DBSchema,
  deleteDB,
  IDBPDatabase,
  IDBPTransaction,
  openDB,
  StoreNames,
} from 'idb';
import {
  CacheItem,
  FileItem,
  LoadConfig,
  LoadItem,
  LoadProtocol,
  Optional,
  UrlDetails,
} from './types';

export interface HDrezkaGrabberDB extends DBSchema {
  urlDetail: {
    key: number;
    value: UrlDetails;
    indexes: {
      movie_id: number;
    };
  };
  loadConfig: {
    key: number;
    value: LoadConfig;
    indexes: {
      config_id: number;
      load_item_ids: number;
    };
  };
  loadStorage: {
    key: number;
    value: Optional<LoadItem, 'id'>;
    indexes: {
      load_id: number;
      movie_id: number;
    };
  };
  fileStorage: {
    key: number;
    value: Optional<FileItem, 'id'>;
    indexes: {
      file_id: number;
      download_id: number;
      load_item_id: number;
    };
  };
  logStorage: {
    key: number;
    value: LogMessage & { id?: number };
    indexes: {
      log_id: number;
      timestamp: number;
    };
  };
  cacheStorage: {
    key: string;
    value: CacheItem;
    indexes: {
      key: string;
      time_of_death: number;
    };
  };
}

export async function doDatabaseStuff(): Promise<
  IDBPDatabase<HDrezkaGrabberDB>
> {
  const db = await openDB<HDrezkaGrabberDB>('HDrezkaGrabberDB', 2, {
    upgrade(db, oldVersion, _newVersion, transaction, _event) {
      if (oldVersion < 1) {
        createDBv0(db);
      }
      if (oldVersion < 2) {
        migrateToV1(transaction);
      }
    },
    terminated() {
      console.error('Database was terminated.');
    },
  });

  db.onversionchange = () => {
    console.info('Database version changed. Close DB connection.');
    db.close();
  };

  logger.info('Database open.');
  return db;
}

export async function dropDatabase() {
  return await deleteDB('HDrezkaGrabberDB', {
    blocked(currentVersion: number, event: IDBVersionChangeEvent) {
      logger.error('Database was blocked:', currentVersion, event);
    },
  });
}

function createDBv0(db: IDBPDatabase<HDrezkaGrabberDB>) {
  const logStorage = db.createObjectStore('logStorage', {
    keyPath: 'id',
    autoIncrement: true,
  });
  logStorage.createIndex('log_id', 'id');
  logStorage.createIndex('timestamp', 'timestamp');

  const fileStorage = db.createObjectStore('fileStorage', {
    keyPath: 'id',
    autoIncrement: true,
  });
  fileStorage.createIndex('file_id', 'id');
  fileStorage.createIndex('download_id', 'downloadId');
  fileStorage.createIndex('load_item_id', 'relatedLoadItemId');

  const movieItems = db.createObjectStore('loadStorage', {
    keyPath: 'id',
    autoIncrement: true,
  });
  movieItems.createIndex('load_id', 'id');
  movieItems.createIndex('movie_id', 'movieId');

  const loadConfigs = db.createObjectStore('loadConfig', {
    keyPath: 'createdAt',
  });
  loadConfigs.createIndex('config_id', 'createdAt');
  loadConfigs.createIndex('load_item_ids', 'loadItemIds', {
    multiEntry: true,
  });

  const urlDetails = db.createObjectStore('urlDetail', {
    keyPath: 'movieId',
  });
  urlDetails.createIndex('movie_id', 'movieId');

  const cacheStorage = db.createObjectStore('cacheStorage', {
    keyPath: 'timeOfDeath',
  });
  cacheStorage.createIndex('key', 'key');
  cacheStorage.createIndex('time_of_death', 'timeOfDeath');
}

async function migrateToV1(
  transaction: IDBPTransaction<
    HDrezkaGrabberDB,
    DBStoreName[],
    'versionchange'
  >,
) {
  logger.info('Migration DB to version 1.');

  await updateStoreValues(transaction, 'loadConfig', (value) => {
    value.loadProtocol = LoadProtocol.streaming;
    value.useCloudflareBypass = false;
    value.tabId = undefined;
    return value;
  });

  await updateStoreValues(transaction, 'fileStorage', (value) => {
    if (value.retryAttempts === 0) {
      value.downloadId = 1;
    }
    return value;
  });

  await updateStoreValues(transaction, 'loadStorage', (value) => {
    value.availableQualities =
      value.availableQualities
        ?.map(parseQuality)
        .sort((a, b) => getQualityWeight(a) - getQualityWeight(b)) ?? null;
    return value;
  });

  logger.info('Migration DB to version 1 completed.');
}

type DBStoreName = StoreNames<HDrezkaGrabberDB>;
type CursorValue<TName extends DBStoreName> = HDrezkaGrabberDB[TName]['value'];

async function updateStoreValues<
  TStores extends readonly DBStoreName[],
  TName extends TStores[number],
>(
  transaction: IDBPTransaction<HDrezkaGrabberDB, TStores, 'versionchange'>,
  storeName: TName,
  fn: (
    value: CursorValue<TName>,
  ) => CursorValue<TName> | Promise<CursorValue<TName>>,
) {
  logger.debug(`Start updating "${storeName}" store.`);
  const store = transaction.objectStore(storeName);

  let cursor = await store.openCursor();
  while (cursor) {
    const nextValue = await fn(cursor.value);
    await cursor.update(nextValue);
    cursor = await cursor.continue();
  }
  logger.debug(`Finish updating "${storeName}" store.`);
}
