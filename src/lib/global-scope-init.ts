// говнокод on
import polyfill from 'webextension-polyfill';

import { BufferedEventBus } from '@/lib/event-bus';
import { Logger } from '@/lib/logger';
import { getSessionId } from '@/lib/utils';

globalThis.browser = polyfill;
globalThis.eventBus = new BufferedEventBus();
globalThis.logger = new Logger({ sessionId: getSessionId() });
// говнокод off
