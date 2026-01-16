import { Logger } from '@/lib/logger';
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
import { getFromCache, setInCache } from '@/service-worker/cache';
import { Input, InputVideoTrack, MP4, UrlSource } from 'mediabunny';

const inFlightFetches = new Map<string, Promise<URLItem>>();

export async function getQualityFileSize({
  urlsContainer,
  siteUrl,
  logger = globalThis.logger,
}: {
  urlsContainer: QualitiesList | null;
  siteUrl: string;
  logger?: Logger;
}): Promise<URLsContainer | null> {
  logger.info('Attempt to get quality sizes.');

  if (!urlsContainer) {
    logger.warning('No qualities list was provided.');
    return null;
  }

  const urlsSizes: (readonly [QualityItem, URLItem])[] = await Promise.all(
    Object.entries(urlsContainer).map(async ([key, urlsList]) => {
      const request: RequestUrlSize = { urlsList, siteUrl, onlySize: true };
      const size = await fetchUrlSizes({ request, logger });
      return [key as QualityItem, size] as const;
    }),
  );
  return Object.fromEntries(urlsSizes);
}

export async function fetchUrlSizes({
  request,
  logger = globalThis.logger,
}: {
  request: RequestUrlSize;
  logger?: Logger;
}): Promise<URLItem> {
  logger.info('Fetching URL sizes.');

  // Проверяем есть ли хоть один из искомых URL в кэше, у которого размер > 0
  const allItemFromCache = await Promise.all(
    request.urlsList.map(
      async (url) => await getFromCache<URLItem>({ url, logger }),
    ),
  );
  const cleanCache = allItemFromCache.filter((c) => c?.rawSize) as URLItem[];

  if (cleanCache.length) {
    return cleanCache[0];
  }

  logger.info('No cached data found. Fetching from server.');
  const promises = request.urlsList.map(async (item) => {
    // TODO: На текущий момент если один из связанных запросов корректно
    //  завершает работу, остальные не прерываются и продолжают работать
    return await getVideoInfoOrWaitFor({
      videoUrl: item,
      siteUrl: request.siteUrl,
      onlySize: request.onlySize,
      logger,
    });
  });

  return await Promise.any(promises).catch(() => {
    return {
      url: request.urlsList[0],
      stringSize: formatBytes({ bytes: 0 }),
      rawSize: 0,
      videoResolution: null,
    };
  });
}

async function getVideoInfoOrWaitFor({
  videoUrl,
  siteUrl,
  onlySize,
  logger = globalThis.logger,
}: {
  videoUrl: string;
  siteUrl: string;
  onlySize?: boolean;
  logger?: Logger;
}) {
  const existing = inFlightFetches.get(videoUrl);
  if (existing) return existing;

  const promise = getVideoInfo({ videoUrl, siteUrl, onlySize, logger }).then(
    ([url, rawSize, videoResolution]) => {
      const urlItem = {
        url,
        rawSize,
        stringSize: formatBytes({ bytes: rawSize }),
        videoResolution,
      };
      setInCache({ data: urlItem, url: videoUrl, logger }).then();
      return urlItem;
    },
  );

  inFlightFetches.set(videoUrl, promise);
  return promise;
}

function formatBytes({ bytes }: { bytes: number | null }) {
  if (!bytes) return '??? MB';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function getVideoInfo({
  videoUrl,
  siteUrl,
  onlySize,
  logger = globalThis.logger,
}: {
  videoUrl: string;
  siteUrl: string;
  onlySize?: boolean;
  logger?: Logger;
}): Promise<
  readonly [string, number, { width: number; height: number } | null]
> {
  logger.info('Attempt get file size.');

  const [getFinallyUrl, modifiedFetch] = makeModifyFetch({
    sourceUrl: siteUrl,
    logger,
  });
  const input = new Input({
    source: new UrlSource(videoUrl, {
      fetchFn: modifiedFetch,
      // Возвращаем null тем самым прерываем повторные запросы
      getRetryDelay: () => null,
    }),
    formats: [MP4],
  });

  const readVideoInfo = async () => {
    //TODO: Размер файла должен отправляться в попап сразу как только
    // был получен не дожидаясь пока будет получено разрешение видео
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
      logger.debug('File info received:', result);
      return result;
    })
    .catch(async (e) => {
      throw e as Error;
    })
    .finally(() => input.dispose());
}

export async function updateVideoData({
  siteUrl,
  data,
  logger = globalThis.logger,
}: {
  siteUrl: string;
  data: QueryData;
  logger?: Logger;
}) {
  logger.info('Attempt update video data.');

  const time = new Date().getTime();
  const params = new URLSearchParams({ t: time.toString() });
  const fullURL = `${new URL(siteUrl).origin}/ajax/get_cdn_series/?${params}`;
  const body = new URLSearchParams(data).toString();
  const [_getFinallyUrl, modifiedFetch] = makeModifyFetch({
    sourceUrl: siteUrl,
    logger,
  });

  const cache = await getFromCache<ResponseVideoData>({
    url: siteUrl,
    body,
    logger,
  });
  if (cache) return cache;

  return modifiedFetch(fullURL, {
    method: 'POST',
    credentials: 'include',
    body: body,
    headers: {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  }).then(async (response) => {
    const serverResponse: ResponseVideoData = await response.json();
    logger.debug('Server response:', serverResponse);
    setInCache({ data: serverResponse, url: siteUrl, body, logger }).then();
    return serverResponse;
  });
}

function makeModifyFetch({
  sourceUrl,
  logger = globalThis.logger,
}: {
  sourceUrl?: string | URL;
  logger?: Logger;
}): [() => string, typeof fetch] {
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
        // TODO: Стоит использовать Regexp дабы не зависеть от домена при медиа запросах
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
