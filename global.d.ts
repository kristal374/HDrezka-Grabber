import { IDBPDatabase } from 'idb';
import Browser from 'webextension-polyfill';
import messages from './src/_locales/ru/messages.json';
import type { BufferedEventBus } from './src/lib/event-bus';
import { HDrezkaGrabberDB } from './src/lib/idb-storage';
import type { Logger } from './src/lib/logger';
import type { EventBusTypes } from './src/lib/types';

type OverrideBrowser = typeof Browser & {
  i18n: {
    getMessage: (
      messageName: keyof typeof messages,
      substitutions?: string | string[],
    ) => string;
  };
};

declare global {
  var browser: OverrideBrowser;
  var logger: Logger;
  var eventBus: BufferedEventBus<EventBusTypes>;
  var debugFlag: boolean;
  var indexedDBObject: IDBPDatabase<HDrezkaGrabberDB>;
}

export {};
