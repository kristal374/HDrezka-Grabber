import { DBSchema, IDBPDatabase, openDB } from 'idb';
import {
  FileItem,
  LoadConfig,
  LoadItem,
  LogMessage,
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
    value: Omit<LoadItem, 'id'> & { id?: number };
    indexes: {
      load_id: number;
      movie_id: number;
    };
  };
  fileStorage: {
    key: number;
    value: Omit<FileItem, 'id'> & { id?: number };
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
}

export async function doDatabaseStuff(): Promise<
  IDBPDatabase<HDrezkaGrabberDB>
> {
  return await openDB<HDrezkaGrabberDB>('HDrezkaGrabberDB', 1, {
    upgrade(db, oldVersion, _newVersion, _transaction, _event) {
      switch (oldVersion) {
        case 0:
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
      }
    },
    terminated() {
      logger.critical('Database was terminated.');
    },
  });
}
