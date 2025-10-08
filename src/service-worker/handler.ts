import {
  QualitiesList,
  QualityItem,
  QueryData,
  ResponseVideoData,
  URLItem,
  URLsContainer,
} from '@/lib/types';
import { hashCode } from '@/lib/utils';
import { Input, MP4, UrlSource } from 'mediabunny';

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
    const [size, resolution] = await getSizeAndVideoResolution(item);
    return {
      url: item,
      stringSize: formatBytes(size),
      rawSize: size,
      videoResolution: resolution,
    };
  });

  return await Promise.any(promises).catch(() => {
    return {
      url: urlsList[0],
      stringSize: formatBytes(0),
      rawSize: 0,
      videoResolution: null,
    };
  });
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function getSizeAndVideoResolution(resource: string) {
  logger.info('Attempt get file size.');
  const input = new Input({
    source: new UrlSource(resource, {
      fetchFn: modifiedFetch,
      getRetryDelay: () => null,
    }),
    formats: [MP4],
  });

  const readVideoInfo = async () => {
    const fileSize = await input.source.getSize();

    const track =
      (settings.getRealQuality && (await input.getPrimaryVideoTrack())) || null;
    if (!fileSize || fileSize === 0) throw new Error();
    logger.debug('File size received:', fileSize);
    return [
      fileSize,
      track
        ? {
            width: track!.codedWidth,
            height: track!.codedHeight,
          }
        : null,
    ] as const;
  };

  return readVideoInfo()
    .then((result) => {
      const [fileSize, videoResolution] = result;
      if (!fileSize || fileSize === 0) throw new Error();
      logger.debug('File size received:', fileSize);
      return [fileSize, videoResolution] as const;
    })
    .catch(async (e) => {
      throw e as Error;
    })
    .finally(() => input.dispose());
}

export async function updateVideoData(siteURL: string, data: QueryData) {
  logger.info('Attempt update video data.');
  const url = new URL(siteURL);
  const time = new Date().getTime();
  const params = new URLSearchParams({ t: time.toString() });
  const fullURL = `${url.origin}/ajax/get_cdn_series/?${params}`;

  return modifiedFetch(fullURL, {
    method: 'POST',
    credentials: 'include',
    body: new URLSearchParams(data).toString(),
    headers: {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  }).then(async (response) => {
    const serverResponse: ResponseVideoData = await response.json();
    logger.debug('Server response:', serverResponse);
    return serverResponse;
  });
}

async function modifiedFetch(
  input: string | URL | Request,
  init?: RequestInit,
) {
  logger.debug('Fetch query:', input, init);
  const ruleId = await addHeaderModificationRule(input);

  const controller = new AbortController();
  const combinedSignal = init?.signal
    ? combineSignals(init.signal, controller.signal)
    : controller.signal;

  const timeout = setTimeout(() => controller.abort('Timeout.'), 10_000);
  return await fetch(input, {
    ...init,
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
    .finally(async () => await removeHeaderModificationRule(ruleId));
}

function combineSignals(...signals: AbortSignal[]): AbortSignal {
  if (signals.length === 1) return signals[0];
  const mainController = new AbortController();

  const abortHandler = (event: Event) => {
    const signal = event.target as AbortSignal;
    mainController.abort(`Signal aborted: ${signal.reason}`);
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

async function addHeaderModificationRule(targetUrl: string | URL | Request) {
  const url = !(targetUrl instanceof Request)
    ? targetUrl instanceof URL
      ? targetUrl
      : new URL(targetUrl)
    : new URL(targetUrl.url);

  const ruleId = hashCode(
    `${url.href}-${new Date().getTime()}-${Math.random()}`,
  );
  // TODO: пересмотреть подход обновления правил для каждого запроса.
  // Дополнительно, возможно стоит заменить на updateSessionRules
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/updateSessionRules
  await browser.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: ruleId,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            {
              header: 'Referer',
              operation: 'set',
              value: url.href,
            },
            {
              header: 'Origin',
              operation: 'set',
              value: url.origin,
            },
            {
              header: 'Sec-Fetch-Site',
              operation: 'set',
              value: 'same-origin',
            },
          ],
        },
        condition: {
          urlFilter: url.href,
          resourceTypes: ['media', 'xmlhttprequest', 'other'],
        },
      },
    ],
    removeRuleIds: [ruleId],
  });
  return ruleId;
}

async function removeHeaderModificationRule(ruleId: number) {
  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ruleId],
  });
}
