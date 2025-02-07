import browser from 'webextension-polyfill';
import { Logger, printLog } from '../lib/logger';
import { LogMessage } from '../lib/types';

const logger = new Logger();

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
  printLog(message);
  browser.storage.session
    .set({
      id: ++id,
      [`l-${id}`]: message,
    })
    .then();
  return true;
}

export default logger;
