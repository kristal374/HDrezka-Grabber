import {
  QualitiesList,
  QualityItem,
  QueryData,
  RequestUrlSize,
  ResponseVideoData,
  URLItem,
  URLsContainer,
} from '@/lib/types';
import { hashCode } from '@/lib/utils';
import { Input, InputVideoTrack, MP4, UrlSource } from 'mediabunny';

export async function getQualityFileSize(
  urlsContainer: QualitiesList | null,
  siteUrl: string,
): Promise<URLsContainer | null> {
  logger.info('Attempt to get quality sizes.');

  if (!urlsContainer) {
    logger.warning('No qualities list was provided.');
    return null;
  }

  const urlsSizes: (readonly [QualityItem, URLItem])[] = await Promise.all(
    Object.entries(urlsContainer).map(([key, urlsList]) =>
      fetchUrlSizes({ urlsList, siteUrl, onlySize: true }).then(
        (size) => [key as QualityItem, size] as const,
      ),
    ),
  );
  return Object.fromEntries(urlsSizes);
}

export async function fetchUrlSizes(request: RequestUrlSize): Promise<URLItem> {
  logger.info('Fetching URL sizes.');
  const promises = request.urlsList.map(async (item) => {
    const [url, rawSize, videoResolution] = await getVideoInfo(
      item,
      request.siteUrl,
      request.onlySize,
    );
    return { url, rawSize, stringSize: formatBytes(rawSize), videoResolution };
  });

  return await Promise.any(promises).catch(() => {
    return {
      url: request.urlsList[0],
      stringSize: formatBytes(0),
      rawSize: 0,
      videoResolution: null,
    };
  });
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '??? MB';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function getVideoInfo(
  videoUrl: string,
  siteUrl: string,
  onlySize?: boolean,
): Promise<
  readonly [string, number, { width: number; height: number } | null]
> {
  logger.info('Attempt get file size.');

  const [getFinallyUrl, modifiedFetch] = makeModifyFetch(siteUrl);
  const input = new Input({
    source: new UrlSource(videoUrl, {
      fetchFn: modifiedFetch,
      // Возвращаем null тем самым прерываем повторные запросы
      getRetryDelay: () => null,
    }),
    formats: [MP4],
  });

  const readVideoInfo = async () => {
    const fileSize = await input.source.getSize();
    if (!fileSize || fileSize === 0) throw new Error();

    let track: InputVideoTrack | null = null;
    if (settings.getRealQuality && !(onlySize ?? false)) {
      track = await input.getPrimaryVideoTrack();
    }

    logger.debug('File size received:', fileSize);
    return [
      getFinallyUrl(),
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
      const [url, fileSize, videoResolution] = result;
      if (!fileSize || fileSize === 0) throw new Error();
      logger.debug('File size received:', fileSize);
      return [url, fileSize, videoResolution] as const;
    })
    .catch(async (e) => {
      throw e as Error;
    })
    .finally(() => input.dispose());
}

export async function updateVideoData(siteUrl: string, data: QueryData) {
  logger.info('Attempt update video data.');

  const url = new URL(siteUrl);
  const time = new Date().getTime();
  const params = new URLSearchParams({ t: time.toString() });
  const fullURL = `${url.origin}/ajax/get_cdn_series/?${params}`;
  const [_getFinallyUrl, modifiedFetch] = makeModifyFetch(siteUrl);

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

function makeModifyFetch(
  sourceUrl?: string | URL,
): [() => string, typeof fetch] {
  let finallyUrl: string;
  return [
    () => finallyUrl,
    async (input: string | URL | Request, init?: RequestInit) => {
      logger.debug('Fetch query:', input, init);
      const ruleId = await addHeaderModificationRule(input, sourceUrl);

      finallyUrl = !(input instanceof Request)
        ? input instanceof URL
          ? input.href
          : input
        : input.url;

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
          finallyUrl = response.url;
          clearTimeout(timeout);
          return response;
        })
        .catch((e) => {
          const error = e as Error;
          logger.error(error.toString());
          throw error;
        })
        .finally(async () => await removeHeaderModificationRule(ruleId));
    },
  ];
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

async function addHeaderModificationRule(
  targetUrl: string | URL | Request,
  sourceUrl?: string | URL,
) {
  const target = !(targetUrl instanceof Request)
    ? targetUrl instanceof URL
      ? targetUrl
      : new URL(targetUrl)
    : new URL(targetUrl.url);
  const source = !(sourceUrl instanceof URL)
    ? typeof sourceUrl !== 'undefined'
      ? new URL(sourceUrl)
      : undefined
    : sourceUrl;

  const isMediaFile = /\.mp4|\.m3u8|\.vtt/.test(target.pathname);
  const isSubtitleFile = /\.vtt/.test(target.pathname);

  const origin = (source ?? target).origin;
  const referer = isMediaFile ? `${origin}/` : target.href;
  const secFetchSite = isMediaFile ? 'cross-site' : 'same-origin';
  const secFetchDest = isMediaFile && !isSubtitleFile ? 'video' : 'empty';

  const ruleId = hashCode(
    `${target.href}-${new Date().getTime()}-${Math.random()}`,
  );
  await browser.declarativeNetRequest.updateSessionRules({
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
              value: secFetchSite,
            },
            {
              header: 'Sec-Fetch-Dest',
              operation: 'set',
              value: secFetchDest,
            },
          ],
        },
        condition: { urlFilter: target.href },
      },
    ],
    removeRuleIds: [ruleId],
  });
  return ruleId;
}

async function removeHeaderModificationRule(ruleId: number) {
  await browser.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [ruleId],
  });
}
