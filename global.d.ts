import Browser from 'webextension-polyfill';
import messages from './src/_locales/ru/messages.json';
import { Logger } from './src/lib/logger';
import { HDrezkaGrabberDB } from './src/service-worker/idb-storage';
import { IDBPDatabase } from 'idb';

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
