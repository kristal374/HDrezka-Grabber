// говнокод on
import polyfill from 'webextension-polyfill';

import { BufferedEventBus } from '@/lib/event-bus';
import { getSessionId, Logger } from '@/lib/logger';
import { MessageBroker } from '@/lib/notification/message-broker';

globalThis.browser = polyfill;
globalThis.eventBus = new BufferedEventBus();
globalThis.logger = new Logger({ sessionId: getSessionId() });
globalThis.messageBroker = new MessageBroker();
// говнокод off
