import '../../lib/logger';

import {
  decodeSubtitleURL,
  decodeVideoURL,
  getQualityWeight,
  sortQualityItem,
} from '../../lib/link-processing';
import { getFromStorage } from '../../lib/storage';
import {
  FileItem,
  FileType,
  LoadConfig,
  LoadItem,
  LoadStatus,
  QualityItem,
  QueryData,
  ResponseVideoData,
  SubtitleInfo,
  UrlDetails,
} from '../../lib/types';
import { fetchUrlSizes, getQualityFileSize, updateVideoData } from '../handler';

type SiteLoaderAsyncParams = {
  downloadItem: LoadItem;
  loadConfig: LoadConfig;
  urlDetails: UrlDetails;
};

export interface SiteLoader {
  downloadItem: LoadItem;

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
    return await updateVideoData(
      this.urlDetails.siteUrl,
      this.getQueryData(),
    ).catch((e) => {
      const error = e as Error;
      logger.error('Server returned a bad response:', error.toString());
      return null;
    });
  }

  async getVideoUrl(): Promise<string | null> {
    const videoData = await this.getVideoData();
    if (!videoData || !videoData.success || !videoData.url) return null;

    const qualitiesList = decodeVideoURL(videoData.url)!;
    this.downloadItem.availableQualities = Object.keys(
      qualitiesList,
    ) as QualityItem[];
    await indexedDBObject.put('loadStorage', this.downloadItem);

    if (
      this.downloadItem.availableQualities.includes(this.loadConfig.quality)
    ) {
      const urlItem = await fetchUrlSizes(
        qualitiesList[this.loadConfig.quality]!,
      );
      if (urlItem.rawSize > 0) return urlItem.url;
      logger.warning('"urlItem" is empty - skip.');
    }

    const qualitySizes = await getQualityFileSize(qualitiesList);
    if (qualitySizes === null) {
      logger.warning('It was not possible to get quality sizes');
      return null;
    }

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

    if (!videoData || !videoData.success || !videoData.subtitle) return null;

    const subtitlesList = decodeSubtitleURL({
      subtitle: videoData.subtitle,
      subtitle_def: videoData.subtitle_def,
      subtitle_lns: videoData.subtitle_lns,
    } as SubtitleInfo)!;
    this.downloadItem.availableSubtitles = subtitlesList.map(
      (subtitle) => subtitle.lang,
    );
    await indexedDBObject.put('loadStorage', this.downloadItem);
    // TODO: Если нет субтитров список доступных субтитров не обновляется аналогично для видео

    if (
      this.loadConfig.subtitle &&
      this.downloadItem.availableSubtitles.includes(
        this.loadConfig.subtitle.lang,
      )
    ) {
      return subtitlesList.find(
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
    // %n - Номер файла
    // %movie_id - Идентификатор фильма
    // %title - Локализованное название фильма
    // %orig_title - Оригинальное название фильма
    // %translate - Название озвучки
    // %translate_id - идентификатор озвучки
    // %episode - Полное название серии
    // %episode_id - Идентификатор серии
    // %season - Полное название сезона
    // %season_id - Идентификатор сезона
    // %quality - Качество видео
    // %subtitle_code - Код языка субтитров
    // %subtitle_lang - Язык субтитров
    // %data - Дата начала загрузки
    // %time - Время начала загрузки
    const userTemplate =
      (await getFromStorage<string>('template')) ??
      '%orig_title%_%n%_S%id_season%E%id_episode%';

    const replacements: Record<string, string | undefined> = {
      '%n%': (
        this.loadConfig.loadItemIds.lastIndexOf(this.downloadItem.id) + 1
      ).toString(),
      '%movie_id%': this.downloadItem.movieId.toString(),
      '%title%': this.urlDetails.filmTitle.localized,
      '%orig_title%':
        this.urlDetails.filmTitle.original ??
        this.urlDetails.filmTitle.localized,
      '%translate%': this.loadConfig.voiceOver.title,
      '%id_translate%': this.loadConfig.voiceOver.id,
      '%episode%': this.downloadItem.episode?.title,
      '%id_episode%': this.downloadItem.episode?.id,
      '%season%': this.downloadItem.season?.title,
      '%id_season%': this.downloadItem.season?.id,
      '%quality%': this.loadConfig.quality,
      '%subtitle_code%': this.loadConfig.subtitle?.code,
      '%subtitle_lang%': this.loadConfig.subtitle?.lang,
      '%data%': new Date(timestamp).toLocaleString().split(', ')[0],
      '%time%': new Date(timestamp).toLocaleString().split(', ')[1],
    };

    let filename = userTemplate;
    for (const [token, value] of Object.entries(replacements)) {
      filename = filename.replaceAll(token, value ?? '');
    }
    const directory =
      (await getFromStorage<string>('directory')) ?? 'HDrezkaGrabber/';
    const extension = fileType == 'video' ? '.mp4' : '.vtt';

    return directory + filename + extension;
  }
}
