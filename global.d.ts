import type { BufferedEventBus } from '@/lib/event-bus';
import { HDrezkaGrabberDB } from '@/lib/idb-storage';
import type { Logger } from '@/lib/logger';
import type { MessageBroker } from '@/lib/notification/message-broker';
import type { EventBusTypes, Settings } from '@/lib/types';
import { IDBPDatabase } from 'idb';
import Browser, { Permissions } from 'webextension-polyfill';
import messages from './src/_locales/ru/messages.json';

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
  var permissions: Permissions.AnyPermissions;
  var indexedDBObject: IDBPDatabase<HDrezkaGrabberDB>;
}

export {};
