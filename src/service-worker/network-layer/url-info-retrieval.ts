import { Logger } from '@/lib/logger';
import {
  QualitiesList,
  QualityItem,
  RequestUrlSize,
  URLItem,
  URLsContainer,
} from '@/lib/types';
import { getFromCache, setInCache } from '@/service-worker/network-layer/cache';
import {
  abortFetch,
  makeModifyFetch,
} from '@/service-worker/network-layer/modify-fetch';
import { probeVideoFile } from '@/service-worker/network-layer/video-file-helpers';

const dedupeUrlMap = new Map<string, Promise<URLItem>>();

export async function getQualityFileSizes({
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
      const size = await getOriginalUrlItem({ request, logger });
      return [key as QualityItem, size] as const;
    }),
  );
  return Object.fromEntries(urlsSizes);
}

export async function getOriginalUrlItem({
  request,
  logger = globalThis.logger,
}: {
  request: RequestUrlSize;
  logger?: Logger;
}) {
  logger.info('Fetching URL sizes.');

  // Проверяем есть ли хоть один из искомых URL в кэше, у которого размер > 0
  const allItemFromCache = await Promise.all(
    request.urlsList.map(
      async (url) => await getFromCache<URLItem>({ url, logger }),
    ),
  );

  const cleanCache = allItemFromCache.filter(Boolean) as URLItem[];
  if (cleanCache.length) {
    return cleanCache[0];
  }

  logger.debug('No cached data found. Fetching from server.');
  const promises = request.urlsList.map(async (item) => {
    return await fetchVideoInfo({
      videoUrl: item,
      sourceUrl: request.siteUrl,
      onlySize: request.onlySize,
      logger,
    });
  });

  return await Promise.any(promises)
    .then((result) => {
      request.urlsList.forEach((item) => abortFetch(item));
      return result;
    })
    .catch(() => {
      return {
        url: request.urlsList[0],
        fileSize: 0,
        videoResolution: null,
      };
    });
}

// async function fetchVideoInfoOrWaitFor({
async function fetchVideoInfo({
  videoUrl,
  sourceUrl,
  onlySize,
  logger = globalThis.logger,
}: {
  videoUrl: string;
  sourceUrl: string;
  onlySize?: boolean;
  logger?: Logger;
}) {
  const existing = dedupeUrlMap.get(videoUrl);
  if (existing) return existing;

  const [getFinallyUrl, modifiedFetch] = makeModifyFetch({ sourceUrl, logger });
  const onSizeReceived = (size: number) => {
    console.log('size', size);
  };
  const onResolutionReceived = (
    resolution: { width: number; height: number } | null,
  ) => {
    console.log('resolution', resolution);
  };

  const promise = probeVideoFile({
    videoUrl,
    fetchFn: modifiedFetch,
    onSizeReceived,
    onResolutionReceived: onlySize ? undefined : onResolutionReceived,
    logger,
  }).then((result) => {
    const urlItem: URLItem = {
      url: getFinallyUrl(),
      fileSize: result.filesize,
      videoResolution: result.resolution,
    };

    if (urlItem.fileSize) {
      setInCache({ data: urlItem, url: videoUrl, logger }).then();
    }
    return urlItem;
  });

  dedupeUrlMap.set(videoUrl, promise);
  return promise;
}
