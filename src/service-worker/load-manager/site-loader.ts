import {
  cleanTitle,
  makePathAndFilename,
  Replacements,
} from '@/lib/filename-maker';
import {
  decodeSubtitleURL,
  decodeVideoURL,
  getQualityWeight,
  sortQualityItem,
} from '@/lib/link-processing';
import type {
  FileItem,
  FileType,
  LoadConfig,
  LoadItem,
  QualityItem,
  QueryData,
  ResponseVideoData,
  Subtitle,
  SubtitleInfo,
  UrlDetails,
} from '@/lib/types';
import { LoadStatus } from '@/lib/types';
import {
  fetchUrlSizes,
  getQualityFileSize,
  updateVideoData,
} from '@/service-worker/network-layer';

type SiteLoaderAsyncParams = {
  downloadItem: LoadItem;
  loadConfig: LoadConfig;
  urlDetails: UrlDetails;
};

export interface SiteLoader {
  downloadItem: LoadItem;
  loadConfig: LoadConfig;
  urlDetails: UrlDetails;

  getQueryData(): QueryData;

  getVideoData(): Promise<ResponseVideoData | null>;

  getVideoUrl(): Promise<string | null>;

  getSubtitlesUrl(): Promise<string | null>;

  createAndGetFile(): Promise<readonly [FileItem | null, FileItem | null]>;

  makeFilename(fileType: FileType, timestamp: number): Promise<string>;
}

export class HDrezkaLoader implements SiteLoader {
  public readonly downloadItem: LoadItem;
  public readonly loadConfig: LoadConfig;
  public readonly urlDetails: UrlDetails;
  private serverResponse: ResponseVideoData | null = null;
  private qualitiesList: Partial<Record<QualityItem, string[]>> | null = null;
  private subtitlesList: Subtitle[] | null = null;

  constructor(async_param: SiteLoaderAsyncParams | undefined) {
    if (typeof async_param === 'undefined') {
      throw new Error('Cannot be called directly');
    }
    this.downloadItem = async_param.downloadItem;
    this.loadConfig = async_param.loadConfig;
    this.urlDetails = async_param.urlDetails;
  }

  static async build(downloadItem: LoadItem) {
    const async_result = await this.asyncConstructor(downloadItem);
    return new HDrezkaLoader(async_result);
  }

  private static async asyncConstructor(
    downloadItem: LoadItem,
  ): Promise<SiteLoaderAsyncParams> {
    const urlDetails = (await indexedDBObject.getFromIndex(
      'urlDetail',
      'movie_id',
      downloadItem.movieId,
    ))!;
    const loadConfig = (await indexedDBObject.getFromIndex(
      'loadConfig',
      'load_item_ids',
      downloadItem.id,
    ))!;

    return {
      downloadItem,
      loadConfig,
      urlDetails,
    };
  }

  getQueryData(): QueryData {
    return this.downloadItem.season === null
      ? {
          id: this.downloadItem.movieId.toString(),
          translator_id: this.loadConfig.voiceOver.id,
          is_camrip: this.loadConfig.voiceOver.is_camrip!,
          is_ads: this.loadConfig.voiceOver.is_ads!,
          is_director: this.loadConfig.voiceOver.is_director!,
          favs: this.loadConfig.favs,
          action: 'get_movie',
        }
      : {
          id: this.downloadItem.movieId.toString(),
          translator_id: this.loadConfig.voiceOver.id,
          season: this.downloadItem.season!.id,
          episode: this.downloadItem.episode!.id,
          favs: this.loadConfig.favs,
          action: 'get_stream',
        };
  }

  async getVideoData(): Promise<ResponseVideoData | null> {
    if (!this.serverResponse) {
      this.serverResponse = await updateVideoData(
        this.urlDetails.siteUrl,
        this.getQueryData(),
      ).catch((e) => {
        const error = e as Error;
        logger.error('Server returned a bad response:', error.toString());
        return null;
      });

      if (this.serverResponse?.success) {
        if (this.serverResponse.url) {
          this.qualitiesList = decodeVideoURL(this.serverResponse.url)!;
          this.downloadItem.availableQualities = Object.keys(
            this.qualitiesList,
          ) as QualityItem[];
        }
        if (this.serverResponse.subtitle) {
          this.subtitlesList = decodeSubtitleURL({
            subtitle: this.serverResponse.subtitle,
            subtitle_def: this.serverResponse.subtitle_def,
            subtitle_lns: this.serverResponse.subtitle_lns,
          } as SubtitleInfo)!;
          this.downloadItem.availableSubtitles = this.subtitlesList.map(
            (subtitle) => subtitle.lang,
          );
        }

        await indexedDBObject.put('loadStorage', this.downloadItem);
      }
    }

    return this.serverResponse;
  }

  async getVideoUrl(): Promise<string | null> {
    const videoData = await this.getVideoData();
    if (!videoData?.url) return null;

    if (
      this.loadConfig.subtitle &&
      settings.actionOnNoSubtitles === 'skip' &&
      !this.subtitlesList
    ) {
      return null;
    }

    if (
      this.downloadItem.availableQualities!.includes(this.loadConfig.quality)
    ) {
      const urlItem = await fetchUrlSizes({
        urlsList: this.qualitiesList![this.loadConfig.quality]!,
        siteUrl: this.urlDetails.siteUrl,
        onlySize: true,
      });
      if (urlItem.rawSize > 0) return urlItem.url;
      logger.warning('"urlItem" is empty - skip.');
    }

    if (settings.actionOnNoQuality !== 'reduce_quality') return null;
    const qualitySizes = (await getQualityFileSize(
      this.qualitiesList,
      this.urlDetails.siteUrl,
    ))!;
    const targetWeight = getQualityWeight(this.loadConfig.quality);
    for (const [qualityItem, urlItem] of Object.entries(
      sortQualityItem(qualitySizes),
    )) {
      const quality = qualityItem as QualityItem;
      if (getQualityWeight(quality) > targetWeight) continue;
      if (urlItem.rawSize > 0) return urlItem.url;
    }

    logger.warning('No suitable "urlItem" was found:', qualitySizes);
    return null;
  }

  async getSubtitlesUrl(): Promise<string | null> {
    const videoData = await this.getVideoData();

    if (!videoData?.subtitle) return null;

    if (
      this.loadConfig.subtitle &&
      this.downloadItem.availableSubtitles!.includes(
        this.loadConfig.subtitle.lang,
      )
    ) {
      return this.subtitlesList!.find(
        (subtitle) => subtitle.lang === this.loadConfig.subtitle!.lang,
      )!.url;
    }
    return null;
  }

  async createAndGetFile(): Promise<
    readonly [FileItem | null, FileItem | null]
  > {
    const time = new Date().getTime();
    let [videoFile, subtitleFile] = [
      this.loadConfig.quality ? await this.createFileItem('video', time) : null,
      this.loadConfig.subtitle
        ? await this.createFileItem('subtitle', time)
        : null,
    ];

    return [videoFile, subtitleFile] as const;
  }

  private async createFileItem(fileType: FileType, timestamp: number) {
    const fileItem = {
      fileType: fileType,
      relatedLoadItemId: this.downloadItem.id,
      dependentFileItemId: null,
      downloadId: null,
      fileName: await this.makeFilename(fileType, timestamp),
      url:
        fileType === 'video'
          ? await this.getVideoUrl()
          : await this.getSubtitlesUrl(),
      saveAs: false,
      retryAttempts: 0,
      status: LoadStatus.DownloadCandidate,
      createdAt: timestamp,
    } as Omit<FileItem, 'id'> & { id?: number | undefined };
    fileItem.id = await indexedDBObject.put('fileStorage', fileItem);
    return fileItem as FileItem;
  }

  async makeFilename(fileType: FileType, timestamp: number): Promise<string> {
    const replacements: Replacements = {
      '%n%': String(
        this.loadConfig.loadItemIds.lastIndexOf(this.downloadItem.id) + 1,
      ),
      '%movie_id%': String(this.downloadItem.movieId),
      '%title%': cleanTitle(this.urlDetails.filmTitle.localized),
      '%orig_title%':
        cleanTitle(this.urlDetails.filmTitle.original) ??
        cleanTitle(this.urlDetails.filmTitle.localized),
      '%translate%': this.loadConfig.voiceOver.title,
      '%translate_id%': this.loadConfig.voiceOver.id,
      '%episode%': this.downloadItem.episode?.title,
      '%episode_id%': this.downloadItem.episode?.id.padStart(2, '0'),
      '%season%': this.downloadItem.season?.title,
      '%season_id%': this.downloadItem.season?.id.padStart(2, '0'),
      '%quality%': this.loadConfig.quality,
      '%subtitle_code%': this.loadConfig.subtitle?.code,
      '%subtitle_lang%': this.loadConfig.subtitle?.lang,
      '%data%': new Date(timestamp).toLocaleString().split(', ')[0],
      '%time%': new Date(timestamp)
        .toLocaleString()
        .split(', ')[1]
        .replaceAll(':', '-'),
    };

    return makePathAndFilename(replacements, fileType).join('');
  }
}
