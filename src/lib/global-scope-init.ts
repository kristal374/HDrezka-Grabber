// говнокод on
import polyfill from 'webextension-polyfill';

import { Logger } from './logger.js';

globalThis.browser = polyfill;
globalThis.logger = new Logger();
// говнокод off
