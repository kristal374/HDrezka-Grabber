import { Logger } from '@/lib/logger';
import {
  Message,
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
import {
  probeVideoFile,
  stopVideoReader,
} from '@/service-worker/network-layer/video-file-helpers';

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

  if (!request.cacheDisabled) {
    // Проверяем есть ли хоть один из искомых URL в кэше, у которого размер > 0
    const allItemFromCache = await Promise.all(
      request.urlsList.map(
        async (url) => await getFromCache<URLItem>({ url, logger }),
      ),
    );

    const cleanCache = allItemFromCache.filter((c) => c?.fileSize) as URLItem[];

    if (cleanCache.length) {
      logger.debug('Cached data found. Returning it.');
      return cleanCache[0];
    }
  }

  logger.debug('No cached data found. Fetching from server.');
  const promises = request.urlsList.map(async (item) => {
    return await fetchVideoInfoOrWaitFor({
      videoUrl: item,
      sourceUrl: request.siteUrl,
      onlySize: request.onlySize,
      logger,
    });
  });

  return await Promise.any(promises)
    .then((result) => {
      request.urlsList.forEach((item) => {
        stopVideoReader(item);
        abortFetch(item);
      });
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

async function fetchVideoInfoOrWaitFor({
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

  const onSizeReceived = (fileSize: number) => {
    browser.runtime
      .sendMessage<Message<URLItem>>({
        type: 'newFileSize',
        message: { url: videoUrl, fileSize },
      })
      .catch(() => {});
  };

  const onResolutionReceived = (
    videoResolution: { width: number; height: number } | null,
  ) => {
    browser.runtime
      .sendMessage<Message<URLItem>>({
        type: 'newVideoResolution',
        message: { url: videoUrl, videoResolution },
      })
      .catch(() => {});
  };

  const promise = probeVideoFile({
    videoUrl,
    fetchFn: modifiedFetch,
    onlySize,
    onSizeReceived,
    onResolutionReceived: onlySize ? undefined : onResolutionReceived,
    logger,
  })
    .then((result) => {
      const urlItem: URLItem = { url: getFinallyUrl(), ...result };
      if (urlItem.fileSize) {
        setInCache({ data: urlItem, url: videoUrl, logger }).then();
      }
      return urlItem;
    })
    .finally(() => dedupeUrlMap.delete(videoUrl));

  dedupeUrlMap.set(videoUrl, promise);
  return promise;
}
