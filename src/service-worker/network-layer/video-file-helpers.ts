import { Logger } from '@/lib/logger';
import {
  QueryData,
  ResponseVideoData,
  VideoInfo,
  VideoResolution,
} from '@/lib/types';
import { getFromCache, setInCache } from '@/service-worker/network-layer/cache';
import { makeModifyFetch } from '@/service-worker/network-layer/modify-fetch';
import { Input, MP4, UrlSource } from 'mediabunny';

export async function fetchVideoData({
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

export async function probeVideoFile({
  videoUrl,
  fetchFn,
  onSizeReceived,
  onResolutionReceived,
  logger = globalThis.logger,
}: {
  videoUrl: string;
  fetchFn: typeof fetch;
  onSizeReceived: (size: number) => void;
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

  const readVideoInfo = async () => {
    const videoInfo: VideoInfo = {
      filesize: await input.source.getSize(),
      resolution: null,
    };
    onSizeReceived(videoInfo.filesize);

    const needToGetVideoResolution = typeof onResolutionReceived === 'function';
    if (settings.getRealQuality && needToGetVideoResolution) {
      const track = await input.getPrimaryVideoTrack();

      videoInfo.resolution = track
        ? { width: track.codedWidth, height: track.codedHeight }
        : null;
      onResolutionReceived(videoInfo.resolution);
    }

    return videoInfo;
  };

  return readVideoInfo()
    .then((result) => {
      logger.debug('Video info received:', result);
      return result;
    })
    .catch(async (e) => {
      logger.error('Error while reading video info:', e.toString());
      throw e as Error;
    })
    .finally(() => input.dispose());
}
