import browser from 'webextension-polyfill';
import { Logger, printLog } from '../lib/logger';
import {
  LogMessage,
  Message,
  ResponseVideoData,
  SerialInfo,
  URLItem,
  URLsContainer,
} from '../lib/types';

const logger = new Logger('/src/js/background.js.map');
let logContainer: LogMessage[] = [];

browser.runtime.onMessage.addListener(
  async (message, _sender, _sendResponse) => {
    const data = message as Message<any>;

    switch (data.type) {
      case 'logCreate':
        return await logCreate(data.message);
      case 'getFileSize':
        return await getQualityFileSize(data.message);
      // case 'updateMovieInfo':
      //   return await updateVideoData("d", {})
      case 'Trigger':
        return await triggerEvent(data.message);
      case 'Progress':
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

async function triggerEvent(message: Message<string>) {
  return true;
}

async function eventProgress(message: Message<number>) {
  return true;
}

async function getQualityFileSize(stream: string | false) {
  if (!stream) return null;

  const urlsContainer: URLsContainer = {};

  const items = clearTrash(stream).split(',');

  const promises = items.map(async (item) => {
    const qualityName = item.match(/\[(.*?)]/)![1];
    const qualityURLs = item.slice(qualityName.length);
    const urlsList = qualityURLs
      .split(/\sor\s/)
      .filter((item) => /https?:\/\/.*mp4$/.test(item));

    urlsContainer[qualityName] = await fetchUrlSizes(urlsList);
  });

  await Promise.all(promises);

  return urlsContainer;
}

function clearTrash(data: string) {
  const trashList = [
    '//_//QEBAQEAhIyMhXl5e',
    '//_//Xl5eIUAjIyEhIyM=',
    '//_//JCQhIUAkJEBeIUAjJCRA',
    '//_//IyMjI14hISMjIUBA',
    '//_//JCQjISFAIyFAIyM=',
  ];
  while (trashList.some((subString) => data.includes(subString))) {
    data = data.replace(new RegExp(trashList.join('|'), 'g'), '');
  }
  data = data.replace('#h', '');
  return atob(data);
}

async function fetchUrlSizes(urlsList: string[]) {
  const urlsItemsList: URLItem[] = await Promise.all(
    urlsList.map(async (item) => {
      const size = await getFileSize(item);
      return { url: item, size: formatBytes(size), rawSize: size };
    }),
  );

  urlsItemsList.sort((a, b) => b.rawSize - a.rawSize);
  return urlsItemsList[0];
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function getFileSize(url: string) {
  try {
    const response = await fetch(url, { method: 'HEAD' });

    if (!response.ok) return 0;

    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength) : 0;
  } catch (error) {
    return 0;
  }
}

async function addHeaderModificationRule(
  fullURL: string,
  referer: string,
  origin: string,
) {
  await browser.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            {
              header: 'Referer',
              operation: 'set',
              value: referer,
            },
            {
              header: 'Origin',
              operation: 'set',
              value: origin,
            },
            {
              header: 'Sec-Fetch-Site',
              operation: 'set',
              value: 'same-origin',
            },
          ],
        },
        condition: {
          urlFilter: fullURL,
          resourceTypes: ['xmlhttprequest'],
        },
      },
    ],
    removeRuleIds: [1],
  });
}

async function removeHeaderModificationRule() {
  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
  });
}

async function updateVideoData(siteURL: string, data: SerialInfo) {
  const url = new URL(siteURL);
  const time = new Date().getTime();
  const params = new URLSearchParams({ t: time.toString() });
  const fullURL = `${url.origin}/ajax/get_cdn_series/?${params}`;

  await addHeaderModificationRule(fullURL, url.href, url.origin);

  try {
    const response = await fetch(fullURL, {
      method: 'POST',
      body: new URLSearchParams(data as Record<string, string>),
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
    });
    return (await response.json()) as ResponseVideoData;
  } finally {
    await removeHeaderModificationRule();
  }
}
