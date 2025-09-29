import {
  QualitiesList,
  QualityItem,
  QueryData,
  ResponseVideoData,
  URLItem,
  URLsContainer,
} from '../lib/types';

type ModificationOptions = {
  fullURL: string;
  referer: string;
  origin: string;
};

export async function getQualityFileSize(
  urlsContainer: QualitiesList | null,
): Promise<URLsContainer | null> {
  logger.info('Attempt to get quality sizes.');

  if (!urlsContainer) {
    logger.warning('No qualities list was provided.');
    return null;
  }

  const urlsSizes: URLsContainer = {};
  for (const [key, value] of Object.entries(urlsContainer)) {
    urlsSizes[key as QualityItem] = await fetchUrlSizes(value);
  }

  return urlsSizes;
}

export async function fetchUrlSizes(urlsList: string[]): Promise<URLItem> {
  logger.info('Fetching URL sizes.');
  const promises = urlsList.map(async (item) => {
    const size = await getFileSize(item);
    return { url: urlsList[0], stringSize: formatBytes(size), rawSize: size };
  });

  return await Promise.any(promises).catch(() => {
    return { url: urlsList[0], stringSize: formatBytes(0), rawSize: 0 };
  });
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function getFileSize(videoURL: string) {
  logger.info('Attempt get file size.');
  const controller = new AbortController();
  return await modifiedFetch(videoURL, {
    method: 'GET',
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok) throw new Error();
      const contentLength = response.headers.get('content-length');
      if (!contentLength || contentLength === '0') throw new Error();
      logger.debug('File size received:', contentLength, videoURL);
      return parseInt(contentLength);
    })
    .finally(() => controller.abort('Outdated.'));
}

export async function updateVideoData(siteURL: string, data: QueryData) {
  logger.info('Attempt update video data.');
  const url = new URL(siteURL);
  const time = new Date().getTime();
  const params = new URLSearchParams({ t: time.toString() });
  const fullURL = `${url.origin}/ajax/get_cdn_series/?${params}`;

  return modifiedFetch(
    fullURL,
    {
      method: 'POST',
      credentials: 'include',
      body: new URLSearchParams(data).toString(),
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
    },
    { fullURL, referer: url.href, origin: url.origin },
  ).then(async (response) => {
    const serverResponse: ResponseVideoData = await response.json();
    logger.debug('Server response:', serverResponse);
    return serverResponse;
  });
}

async function modifiedFetch(
  url: string | URL,
  options?: RequestInit,
  modificationOptions?: ModificationOptions,
) {
  logger.debug('Fetch query:', url, options);
  if (modificationOptions) await addHeaderModificationRule(modificationOptions);

  const controller = new AbortController();
  const combinedSignal = options?.signal
    ? combineSignals(options.signal, controller.signal)
    : controller.signal;

  const timeout = setTimeout(() => controller.abort('Timeout.'), 5000);
  return await fetch(url, {
    ...options,
    signal: combinedSignal,
  })
    .then((response) => {
      clearTimeout(timeout);
      return response;
    })
    .catch((e) => {
      const error = e as Error;
      logger.error(error.toString());
      throw error;
    })
    .finally(async () => await removeHeaderModificationRule());
}

function combineSignals(...signals: AbortSignal[]): AbortSignal {
  if (signals.length === 1) return signals[0];
  const mainController = new AbortController();

  const abortHandler = (event: Event) => {
    const signal = event.target as AbortSignal;
    mainController.abort(new Error(`Signal aborted: ${signal.reason}`));
    signals.forEach((s) => s.removeEventListener('abort', abortHandler));
  };

  signals.forEach((signal) => {
    if (signal.aborted) {
      mainController.abort(signal.reason);
    } else {
      signal.addEventListener('abort', abortHandler);
    }
  });

  return mainController.signal;
}

async function addHeaderModificationRule(
  modificationOptions: ModificationOptions,
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
              value: modificationOptions.referer,
            },
            {
              header: 'Origin',
              operation: 'set',
              value: modificationOptions.origin,
            },
            {
              header: 'Sec-Fetch-Site',
              operation: 'set',
              value: 'same-origin',
            },
          ],
        },
        condition: {
          urlFilter: modificationOptions.fullURL,
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
