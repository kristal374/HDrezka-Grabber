import { IDBPDatabase } from 'idb';
import Browser from 'webextension-polyfill';
import messages from './src/_locales/ru/messages.json';
import type { BufferedEventBus } from './src/lib/event-bus';
import { HDrezkaGrabberDB } from './src/lib/idb-storage';
import type { Logger } from './src/lib/logger';
import type { EventBusTypes, Settings } from './src/lib/types';

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
  var settings: Settings;
  var indexedDBObject: IDBPDatabase<HDrezkaGrabberDB>;
}

export {};
