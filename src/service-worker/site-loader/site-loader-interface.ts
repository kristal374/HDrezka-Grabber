import { Logger } from '@/lib/logger';
import {
  Episode,
  FileItem,
  FileType,
  Initiator,
  LoadConfig,
  LoadItem,
  Optional,
  QueryData,
  ResponseVideoData,
  Season,
  UrlDetails,
} from '@/lib/types';

export type SiteLoaderAsyncParams = {
  downloadItem: LoadItem;
  loadConfig: LoadConfig;
  urlDetails: UrlDetails;
};

export interface SiteLoaderInstance {
  downloadItem: LoadItem;
  loadConfig: LoadConfig;
  urlDetails: UrlDetails;

  getQueryData({ logger }: { logger?: Logger }): QueryData;

  getVideoData({
    logger,
  }: {
    logger?: Logger;
  }): Promise<ResponseVideoData | null>;

  getVideoUrl({ logger }: { logger?: Logger }): Promise<string | null>;

  getSubtitlesUrl({ logger }: { logger?: Logger }): Promise<string | null>;

  createAndGetFile({
    logger,
  }: {
    logger?: Logger;
  }): Promise<readonly [FileItem | null, FileItem | null]>;

  makeFilename({
    fileType,
    timestamp,
  }: {
    fileType: FileType;
    timestamp: number;
    logger?: Logger;
  }): Promise<string>;
}

export interface SiteLoader {
  new ({
    async_param,
  }: {
    async_param?: SiteLoaderAsyncParams;
  }): SiteLoaderInstance;

  build(downloadItem: LoadItem): Promise<SiteLoaderInstance>;

  createLoadItem(
    movieId: number,
    season?: Season,
    episode?: Episode,
  ): Optional<LoadItem, 'id'>;

  createLoadConfig(initiator: Initiator): LoadConfig;

  createUrlDetails(initiator: Initiator): UrlDetails;
}
