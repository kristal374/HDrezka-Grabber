export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

export enum LogLevel {
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

export type MessageType =
  | 'logCreate'
  | 'trigger'
  | 'getFileSize'
  | 'updateVideoInfo';

export type LogMessage = {
  timestamp: number;
  level: LogLevel;
  context: string;
  message: any[];
  location: string;
};

export type Message<T> = {
  type: MessageType;
  message: T;
};

export interface SourceMap {
  version: number;
  file: string;
  sources: string[];
  sourcesContent: string[];
  names: string[];
  mappings: string;
}

export type PageType =
  | 'DEFAULT'
  | 'FILM'
  | 'SERIAL'
  | 'TRAILER'
  | 'LOCATION_FILM'
  | 'LOCATION_SERIAL'
  | 'UNAVAILABLE'
  | 'ERROR';

export type ButtonState =
  | 'DEFAULT'
  | 'PROCESSING'
  | 'LOADING'
  | 'CANCELLED'
  | 'COMPLETED';

export type MovieInfo = {
  success: boolean;
  data: FilmData | SerialData;
  quality: QualityItem;
  streams: string;
  subtitle: SubtitleInfo | null;
  filename: {
    local: string;
    origin: string | null;
  };
  url: string;
};

export type SubtitleInfo = {
  subtitle: false | string;
  subtitle_def: false | string;
  subtitle_lns: false | Record<string, string>;
};

export type VoiceOverInfo = {
  id: string;
  title: string;
  flag_country: string | null;
  prem_content?: boolean;
  is_camrip?: string | null;
  is_director?: string | null;
  is_ads?: string | null;
};

export type Episode = { title: string; id: string };

export type Seasons = Record<string, { title: string; episodes: Episode[] }>;

export type SimpleSeason = Episode;

export type QualityItem =
  | '360p'
  | '480p'
  | '720p'
  | '1080p'
  | '1080p Ultra'
  | '2K'
  | '4K';

export type Subtitle = {
  lang: string;
  code: string;
  url: string;
};

export type QualitiesList = Partial<Record<QualityItem, string[]>>;

export type URLItem = { url: string; stringSize: string; rawSize: number };

export type URLsContainer = Partial<Record<QualityItem, URLItem>>;

export type Action = 'get_movie' | 'get_stream' | 'get_episodes';

export type Fields = {
  id: string;
  translator_id: string;
  favs: string;
};

export type SerialFields = {
  season: string;
  episode: string;
  action: 'get_stream';
};

export type FilmsFields = {
  is_camrip: string;
  is_director: string;
  is_ads: string;
  action: 'get_movie';
};

export type UpdateTranslateFields = { action: 'get_episodes' };

export type FilmData = Fields & FilmsFields;
export type SerialData = Fields & SerialFields;
export type UpdateTranslateData = Fields & UpdateTranslateFields;
export type QueryData = FilmData | SerialData | UpdateTranslateData;

export type ResponseVideoData = {
  success: boolean;
  message: string;
  premium_content: number;
  seasons?: string;
  episodes?: string;
  url: string;
  quality: QualityItem;
  subtitle: string | false;
  subtitle_lns: Record<string, string> | false;
  subtitle_def: string | false;
  thumbnails: string;
};

export type LoadStatus =
  | 'LoadCandidate'
  | 'InitiatingDownload'
  | 'InitiationError'
  | 'Loading'
  | 'DownloadPaused'
  | 'DownloadFailed'
  | 'DownloadSuccess'
  | 'StoppedByUser';

export type FileInfo = {
  downloadId: number | null;
  fileName: string | null;
  realQuality: QualityItem | null;
  absolutePath: string | null; // Путь к загружаемому файлу
  urlItem: URLItem | null;
  saveAs: boolean;
};

export type LoadItem = {
  uid: number;
  urlHash: number;
  queryData: FilmData | SerialData;
  season: SimpleSeason | null;
  episode: Episode | null;
  file: FileInfo;
  retryAttempts: number;
  status: LoadStatus;
};

export type LoadConfig = {
  siteUrl: string;
  filmTitle: {
    localized: string;
    original: string | null;
  };
  subtitle: string | null;
  voiceOver: VoiceOverInfo;
  quality: QualityItem;
  loadItems: number[];
  createdAt: string;
};

export type Initiator = {
  query_data: FilmData | SerialData;
  site_url: string;
  range: Seasons | null;
  film_name: {
    localized: string;
    original: string | null;
  };
  voice_over: VoiceOverInfo;
  quality: QualityItem;
  subtitle: string | null;
  timestamp: Date | string;
};

export type DataForUpdate = {
  siteURL: string;
  movieData: QueryData;
};

export type ActualVideoData = {
  seasons: Seasons | null;
  subtitle: SubtitleInfo;
  streams: string;
};

export type CurrentEpisode = {
  seasonID: string;
  episodeID: string;
};

export type Progress = {
  completed: number | null;
  total: number | null;
  current: number | null;
};
