// говнокод on
import polyfill from 'webextension-polyfill';

import { BufferedEventBus } from './event-bus';
import { Logger } from './logger.js';

globalThis.browser = polyfill;
globalThis.eventBus = new BufferedEventBus();
globalThis.logger = new Logger();
// говнокод off
