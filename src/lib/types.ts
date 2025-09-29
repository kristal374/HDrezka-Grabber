import type { Downloads, Runtime, Storage } from 'webextension-polyfill';

type DownloadItem = Downloads.DownloadItem;
type OnChangedDownloadDeltaType = Downloads.OnChangedDownloadDeltaType;
type MessageSender = Runtime.MessageSender;
type StorageChange = Storage.StorageChange;

export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

export enum LogLevel {
  CRITICAL,
  ERROR,
  WARNING,
  INFO,
  DEBUG,
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

export type SubtitleInfo =
  | {
      subtitle: false;
      subtitle_def: false;
      subtitle_lns: false;
    }
  | {
      subtitle: string;
      subtitle_def: string;
      subtitle_lns: Record<string, string>;
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
export type Season = { title: string; id: string };

export type SeasonsWithEpisodesList = Record<
  string,
  { title: string; episodes: Episode[] }
>;

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

export type ResponseVideoData = {
  success: boolean;
  message: string;
  premium_content: number;
  seasons?: string;
  episodes?: string;
  url: string;
  quality: QualityItem;
  thumbnails: string;
} & SubtitleInfo;

export type Initiator = {
  movieId: string;
  site_url: string;
  film_name: {
    localized: string;
    original: string | null;
  };
  range: SeasonsWithEpisodesList | null;
  voice_over: VoiceOverInfo;
  quality: QualityItem;
  subtitle: {
    lang: string;
    code: string;
  } | null;
  favs: string;
  timestamp: string;
};

export type DataForUpdate = {
  siteURL: string;
  movieData: QueryData;
};

export type ActualVideoData = {
  seasons: SeasonsWithEpisodesList | null;
  subtitle: SubtitleInfo;
  streams: string;
};

export type CurrentEpisode = {
  seasonID: string;
  episodeID: string;
};

export type MovieProgress = {
  videoProgressInPercents: number | null;
  completedLoads: number;
  totalLoads: number;
} | null;

export type URL = string;

export type SubtitleLang = string;

export enum LoadStatus {
  DownloadCandidate = 'DownloadCandidate',
  InitiatingDownload = 'InitiatingDownload',
  InitiationError = 'InitiationError',
  Downloading = 'Downloading',
  DownloadPaused = 'DownloadPaused',
  DownloadFailed = 'DownloadFailed',
  DownloadSuccess = 'DownloadSuccess',
  StoppedByUser = 'StoppedByUser',
}

export enum ContentType {
  'video',
  'subtitle',
  'both',
}

export type FileType = 'video' | 'subtitle';

export type FileItem = {
  id: number;
  fileType: FileType;
  relatedLoadItemId: number;
  dependentFileItemId: number | null;
  downloadId: number | null;
  fileName: string;
  url: URL | null;
  saveAs: boolean;
  retryAttempts: number;
  status: LoadStatus;
  createdAt: number;
};

export type LoadItem = {
  id: number;
  siteType: 'hdrezka';
  movieId: number;
  season: Season | null;
  episode: Episode | null;
  content: ContentType;
  availableQualities: QualityItem[] | null;
  availableSubtitles: SubtitleLang[] | null;
  status: LoadStatus;
};

export type LoadConfig = {
  voiceOver: VoiceOverInfo;
  quality: QualityItem;
  subtitle: {
    lang: SubtitleLang;
    code: string;
  } | null;
  favs: string;
  loadItemIds: number[];
  createdAt: number;
};

export type UrlDetails = {
  movieId: number;
  siteUrl: string;
  filmTitle: {
    localized: string;
    original: string | null;
  };
  loadRegistry: number[];
};

export type FilmQueryData = {
  id: string;
  translator_id: string;
  is_camrip: string;
  is_ads: string;
  is_director: string;
  favs: string;
  action: 'get_movie';
};

export type SerialQueryData = {
  id: string;
  translator_id: string;
  season: string;
  episode: string;
  favs: string;
  action: 'get_stream';
};

export type QueryData = FilmQueryData | SerialQueryData | UpdateTranslateData;

export enum EventType {
  NewMessageReceived = 'MessageReceived',
  DownloadCreated = 'DownloadCreated',
  DownloadEvent = 'DownloadEvent',
  BrowserStartup = 'BrowserStartup',
  StorageChanged = 'StorageChanged',
}

export type EventMessage =
  | {
      type: EventType.DownloadCreated;
      data: DownloadItem;
    }
  | {
      type: EventType.DownloadEvent;
      data: OnChangedDownloadDeltaType;
    };

export type EventBusTypes = {
  [EventType.NewMessageReceived]: [
    unknown,
    MessageSender,
    (message: unknown) => void,
  ];
  [EventType.DownloadCreated]: DownloadItem;
  [EventType.DownloadEvent]: OnChangedDownloadDeltaType;
  [EventType.BrowserStartup]: void;
  [EventType.StorageChanged]: [Record<string, StorageChange>, string];
};
