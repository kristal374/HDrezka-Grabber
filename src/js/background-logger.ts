import browser from 'webextension-polyfill';
import { Logger, printLog } from '../lib/logger';
import { LogMessage } from '../lib/types';

const logger = new Logger('/src/js/background.js.map');

let id: number = 0;
browser.storage.session.get(['id']).then((result) => {
  id = (result as Record<string, number>)?.['id'] || 0;
});

globalThis.addEventListener('logCreate', async (event) => {
  // Поскольку browser.runtime.sendMessage не отправляет сообщения в контекст
  // из которого был отправлен. Нам нужен другой канал связи в качестве которого
  // выступают события logCreate в globalThis.
  const message = event as CustomEvent;
  await logCreate(message.detail);
});

export async function logCreate(message: LogMessage) {
  browser.storage.session
    .set({
      id: ++id,
      [id]: message,
    })
    .then();
  printLog(message);
  return true;
}

export default logger;
