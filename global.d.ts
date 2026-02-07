// noinspection ES6ConvertVarToLetConst

import messages from '@/_locales/ru/messages.json';
import type { BufferedEventBus } from '@/lib/event-bus';
import { HDrezkaGrabberDB } from '@/lib/idb-storage';
import type { Logger } from '@/lib/logger';
import type { MessageBroker } from '@/lib/notification/message-broker';
import type { EventBusTypes, Settings } from '@/lib/types';
import { IDBPDatabase } from 'idb';
import Browser from 'webextension-polyfill';

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
  var messageBroker: MessageBroker;
  var settings: Settings;
  var indexedDBObject: IDBPDatabase<HDrezkaGrabberDB>;
  var root: HTMLDivElement;
}

export {};
