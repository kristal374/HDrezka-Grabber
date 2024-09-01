import browser from 'webextension-polyfill';
import { Logger, printLog } from '../lib/logger';
import { LogMessage, Message } from '../lib/types';

const logger = new Logger('/src/js/background.js.map');
let logContainer: LogMessage[] = [];

browser.runtime.onMessage.addListener(
  async (message, _sender, sendResponse) => {
    const data = message as Message<any>;

    switch (data.type) {
      case 'logCreate':
        sendResponse(logCreate(data.message));
        break;
      case 'Trigger':
        sendResponse(triggerEvent(data.message));
        break;
      case 'Progress':
        sendResponse(eventProgress(data.message));
        break;
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

async function triggerEvent(message: Message<string>) {
  return true;
}

async function eventProgress(message: Message<number>) {
  return true;
}
