import { IDBPDatabase } from 'idb';
import Browser from 'webextension-polyfill';
import messages from './src/_locales/ru/messages.json';
import { HDrezkaGrabberDB } from './src/lib/idb-storage';
import type { Logger } from './src/lib/logger';

type OverrideBrowser = typeof Browser & {
  i18n: {
    getMessage: (
      messageName: keyof typeof messages,
      substitutions?: string | string[],
    ) => string;
  };
};

declare global {
  const browser: OverrideBrowser;
  var logger: Logger;
  var debugFlag: boolean;
  var indexedDBObject: IDBPDatabase<HDrezkaGrabberDB>;
}

export {};