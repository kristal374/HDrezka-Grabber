// говнокод on
import polyfill from 'webextension-polyfill';

import { BufferedEventBus } from '@/lib/event-bus';
import { Logger } from '@/lib/logger';

globalThis.browser = polyfill;
globalThis.eventBus = new BufferedEventBus();
globalThis.logger = new Logger();
// говнокод off
