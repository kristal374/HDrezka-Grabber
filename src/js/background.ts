import browser from 'webextension-polyfill';
import { Logger, printLog } from '../lib/logger';
import { LoadManager } from './LoadManager';
import { Initiator, LogMessage, Message } from '../lib/types';
import { decodeURL, getQualityFileSize } from './handler';

const logger = new Logger('/src/js/background.js.map');
const loadManager = new LoadManager();
let logContainer: LogMessage[] = [];

browser.runtime.onMessage.addListener(
  async (message, _sender, _sendResponse) => {
    const data = message as Message<any>;

    switch (data.type) {
      case 'logCreate':
        return await logCreate(data.message);
      case 'decodeURL':
        return await decodeURL(data.message);
      case 'getFileSize':
        return await getQualityFileSize(data.message);
      // case 'updateMovieInfo':
      //   return await updateVideoData("d", {})
      case 'trigger':
        return await triggerEvent(data.message);
      case 'progress':
        return await eventProgress(data.message);
      default:
        logger.warning(message);
    }
  },
);

globalThis.addEventListener('logCreate', async (event) => {
  const message = event as CustomEvent;
  await logCreate(message.detail);
});

async function logCreate(message: LogMessage) {
  logContainer.push(message);
  printLog(message);
  return true;
}

async function triggerEvent(message: Initiator) {
  return await loadManager.init_new_load(message);
}

async function eventProgress(message: Message<number>) {
  return true;
}
