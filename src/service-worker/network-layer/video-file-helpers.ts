import { Logger } from '@/lib/logger';
import {
  QueryData,
  ResponseVideoData,
  URLItem,
  VideoResolution,
} from '@/lib/types';
import { getFromCache, setInCache } from '@/service-worker/network-layer/cache';
import { makeModifyFetch } from '@/service-worker/network-layer/modify-fetch';
import { Input, MP4, UrlSource } from 'mediabunny';

const activeReader = new Map<string, Input<UrlSource>>();

export async function fetchVideoData({
  siteUrl,
  data,
  cacheDisabled = false,
  logger = globalThis.logger,
}: {
  siteUrl: string;
  data: QueryData;
  cacheDisabled?: boolean;
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

  if (!cacheDisabled) {
    const cache = await getFromCache<ResponseVideoData>({
      url: siteUrl,
      body,
      logger,
    });
    if (cache) return cache;
  }

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
