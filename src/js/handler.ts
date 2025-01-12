import browser from 'webextension-polyfill';
import {
  QualitiesList,
  QualityItem,
  QueryData,
  ResponseVideoData,
  URLItem,
  URLsContainer,
} from '../lib/types';

export async function getQualityFileSize(
  urlsContainer: QualitiesList | null,
): Promise<URLsContainer | null> {
  if (!urlsContainer) return null;

  const urlsSizes: URLsContainer = {};

  await Promise.all(
    Object.entries(urlsContainer).map(async ([item, urls]) => {
      urlsSizes[item as QualityItem] = await fetchUrlSizes(urls);
    }),
  );

  return urlsSizes;
}

export async function fetchUrlSizes(urlsList: string[]): Promise<URLItem> {
  const promises = urlsList.map(async (item) => {
    const size = (await getFileSize(item)) as number;
    return { url: urlsList[0], stringSize: formatBytes(size), rawSize: size };
  });

  return await Promise.any(promises).catch(() => {
    return { url: urlsList[0], stringSize: formatBytes(0), rawSize: 0 };
  });
}

export function formatBytes(bytes: number | null) {
  if (!bytes) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function getFileSize(videoURL: string) {
  const controller = new AbortController();
  return await fetch(videoURL, {
    signal: controller.signal,
    method: 'GET',
  })
    .then((response) => {
      if (!response.ok) throw new Error();
      const contentLength = response.headers.get('content-length');
      if (!contentLength || contentLength === '0') throw new Error();
      return parseInt(contentLength);
    })
    .catch(() => {
      throw new Error();
    })
    .finally(async () => {
      controller.abort();
    });
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
              // I don't know why, but this header in FF uses lowercase
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

export async function updateVideoData(siteURL: string, data: QueryData) {
  const url = new URL(siteURL);
  const time = new Date().getTime();
  const params = new URLSearchParams({ t: time.toString() });
  const fullURL = `${url.origin}/ajax/get_cdn_series/?${params}`;

  await addHeaderModificationRule(fullURL, url.href, url.origin);
  return await fetch(fullURL, {
    method: 'POST',
    credentials: 'include',
    body: new URLSearchParams(data),
    headers: {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  })
    .then(async (response) => {
      return (await response.json()) as ResponseVideoData;
    })
    .finally(async () => await removeHeaderModificationRule());
}
