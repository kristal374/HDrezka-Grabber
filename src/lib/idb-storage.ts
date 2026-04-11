import { LogMessage } from '@/lib/logger';
import { DBSchema, deleteDB, IDBPDatabase, IDBPTransaction, openDB } from 'idb';
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

type StoreNames = (
  | 'urlDetail'
  | 'loadConfig'
  | 'loadStorage'
  | 'fileStorage'
  | 'logStorage'
  | 'cacheStorage'
)[];

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
  transaction: IDBPTransaction<HDrezkaGrabberDB, StoreNames, 'versionchange'>,
) {
  logger.info('Migration DB to version 1.');
  const store = transaction.objectStore('urlDetail');

  let cursor = await store.openCursor();
  while (cursor) {
    const value = cursor.value;
    value.loadProtocol = LoadProtocol.streaming;
    await cursor.update(value);
    cursor = await cursor.continue();
  }
  logger.info('Migration DB to version 1 completed.');
}
