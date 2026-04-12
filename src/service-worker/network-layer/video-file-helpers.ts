import { Logger } from '@/lib/logger';
import {
  QueryData,
  ResponseVideoData,
  URLItem,
  VideoResolution,
} from '@/lib/types';
import { getFromCache, setInCache } from '@/service-worker/network-layer/cache';
import { makeModifyFetch } from '@/service-worker/network-layer/modify-fetch';
import { requestDirectlyFromPage } from '@/service-worker/network-layer/page-bridge';
import { Input, MP4, UrlSource } from 'mediabunny';

const activeReader = new Map<string, Input<UrlSource>>();

const POST_HEADERS = {
  Accept: 'application/json, text/javascript, */*; q=0.01',
  'X-Requested-With': 'XMLHttpRequest',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
} as const;

function buildRequestParams(siteUrl: string): {
  relativeUrl: string;
  fullURL: string;
} {
  const params = new URLSearchParams({ t: Date.now().toString() });
  const relativeUrl = `/ajax/get_cdn_series/?${params}`;
  const fullURL = `${new URL(siteUrl).origin}${relativeUrl}`;
  return { relativeUrl, fullURL };
}

async function fetchFromPage({
  tabId,
  relativeUrl,
  siteUrl,
  data,
  logger,
}: {
  tabId: number;
  relativeUrl: string;
  siteUrl: string;
  data: QueryData;
  logger: Logger;
}): Promise<ResponseVideoData> {
  logger.info('Attempt fetch data from page.');
  const response = await requestDirectlyFromPage({
    tabId,
    url: relativeUrl,
    siteUrl,
    body: data,
    method: 'POST',
    logger,
  });

  if ('error' in response) throw new Error(response.error);
  return { cloudflare_protected: true, ...response };
}

async function fetchDirectly({
  tabId,
  fullURL,
  relativeUrl,
  siteUrl,
  body,
  data,
  modifiedFetch,
  logger,
}: {
  tabId: number;
  fullURL: string;
  relativeUrl: string;
  siteUrl: string;
  body: string;
  data: QueryData;
  modifiedFetch: typeof fetch;
  logger: Logger;
}): Promise<ResponseVideoData> {
  logger.info('Attempt fetch data directly.');
  const response = await modifiedFetch(fullURL, {
    method: 'POST',
    credentials: 'include',
    body,
    headers: POST_HEADERS,
  });

  logger.debug('Server response status:', response.status);

  if (response.status !== 403) {
    return response.json();
  }

  messageBroker
    .sendMessage(data.id, {
      stackable: false,
      message: browser.i18n.getMessage('popup_messageBroker_CloudflareProtect'),
      type: 'warning',
      unique: true,
      closable: false,
    })
    .then();

  return fetchFromPage({ tabId, relativeUrl, siteUrl, data, logger });
}

export async function fetchVideoData({
  tabId,
  siteUrl,
  data,
  useCloudflareBypass = false,
  cacheDisabled = false,
  logger = globalThis.logger,
}: {
  tabId: number;
  siteUrl: string;
  data: QueryData;
  useCloudflareBypass: boolean;
  cacheDisabled?: boolean;
  logger?: Logger;
}): Promise<ResponseVideoData> {
  logger.info('Attempt update video data.');

  const { relativeUrl, fullURL } = buildRequestParams(siteUrl);
  const body = new URLSearchParams(data).toString();
  const [, modifiedFetch] = makeModifyFetch({ sourceUrl: siteUrl, logger });

  if (!cacheDisabled) {
    const cache = await getFromCache<ResponseVideoData>({
      url: siteUrl,
      body,
      logger,
    });
    if (cache) return cache;
  }

  const serverResponse = useCloudflareBypass
    ? await fetchFromPage({ tabId, relativeUrl, siteUrl, data, logger })
    : await fetchDirectly({
        tabId,
        fullURL,
        relativeUrl,
        siteUrl,
        body,
        data,
        modifiedFetch,
        logger,
      });

  logger.debug('Server response:', serverResponse);
  setInCache({ data: serverResponse, url: siteUrl, body, logger }).then();

  return serverResponse;
}

export async function probeVideoFile({
  videoUrl,
  fetchFn,
  onlySize,
  onSizeReceived,
  onResolutionReceived,
  logger = globalThis.logger,
}: {
  videoUrl: string;
  fetchFn: typeof fetch;
  onlySize?: boolean;
  onSizeReceived?: (size: number) => void;
  onResolutionReceived?: (resolution: VideoResolution | null) => void;
  logger?: Logger;
}) {
  logger.info('Attempt get file size.');

  // Возвращаем null тем самым прерываем повторные запросы
  const getRetryDelay = () => null;

  const input = new Input({
    source: new UrlSource(videoUrl, {
      fetchFn,
      getRetryDelay,
    }),
    formats: [MP4],
  });

  activeReader.set(videoUrl, input);

  const videoInfo: Omit<URLItem, 'url'> = {
    fileSize: 0,
    videoResolution: null,
  };

  const readVideoInfo = async () => {
    videoInfo.fileSize = await input.source.getSize();

    if (videoInfo.fileSize === 0) return videoInfo;
    onSizeReceived?.(videoInfo.fileSize);

    if (settings.getRealQuality && !onlySize) {
      const track = await input.getPrimaryVideoTrack();

      videoInfo.videoResolution = track
        ? { width: track.codedWidth, height: track.codedHeight }
        : null;
      onResolutionReceived?.(videoInfo.videoResolution);
    }

    return videoInfo;
  };

  return readVideoInfo()
    .then((result) => {
      logger.debug('Video info received:', result);
      return result;
    })
    .catch(async (error) => {
      logger.error('Error while reading video info:', error.toString());
      throw error as Error;
    })
    .finally(() => {
      input.dispose();
      activeReader.delete(videoUrl);
    });
}

export function stopAllVideoReader({
  logger = globalThis.logger,
}: {
  logger?: Logger;
}) {
  logger.info('Stopping all video readers.');

  activeReader.forEach((reader) => reader.dispose());
  activeReader.clear();
}

export function stopVideoReader({
  url,
  logger = globalThis.logger,
}: {
  url: string;
  logger?: Logger;
}) {
  const reader = activeReader.get(url);
  if (!reader) return;

  logger.info('Stopping video reader:', url);
  reader.dispose();
  activeReader.delete(url);
}
