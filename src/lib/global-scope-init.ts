// говнокод on
import polyfill from 'webextension-polyfill';

import { BufferedEventBus } from './event-bus';
import { Logger } from './logger';
import { MessageBroker } from './notification/message-broker';

globalThis.browser = polyfill;
globalThis.eventBus = new BufferedEventBus();
globalThis.logger = new Logger();
globalThis.messageBroker = new MessageBroker();
// говнокод off
