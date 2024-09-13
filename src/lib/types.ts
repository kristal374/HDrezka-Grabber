export enum LogLevel {
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
}

export type MessageType =
  | 'logCreate'
  | 'Progress'
  | 'Trigger'
  | 'decodeURL'
  | 'getFileSize'
  | 'updateMovieInfo';

export type LogMessage = {
  timestamp: string;
  level: LogLevel;
  content: any[];
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

export type FilmInfo = {
  film_id: string;
  translator_id: string;
  is_camrip: string;
  is_director: string;
  is_ads: string;
  favs: string;
  action: string;
  local_film_name: string;
  original_film_name: string | undefined;
  streams: string;
};

export type SerialInfo = {
  film_id: string;
  translator_id: string;
  season_id: string;
  episode_id: string;
  favs: string;
  action: string;
  local_film_name: string;
  original_film_name: string | undefined;
  streams: string;
};

export type SubtitleInfo = {
  subtitle: false | string;
  subtitle_def: false | string;
  subtitle_lns: false | Record<string, string>;
};

export type VoiceOverInfo = {
  id: string;
  title: string;
  flag_country?: string;
  prem_content?: boolean;
  is_camrip?: string | null;
  is_director?: string | null;
  is_ads?: string | null;
};

export type Episode = { title: string; id: string };

export type Seasons = Record<string, { title: string; episodes: Episode[] }>;

export type TargetTab = { tabId: number };

export type QualityItem =
  | '360p'
  | '480p'
  | '720p'
  | '1080p'
  | '1080p Ultra'
  | '2K'
  | '4K';

export type Quality = Partial<Record<QualityItem, string[]>>;

export type URLItem = { url: string; size: string; rawSize: number };

export type URLsContainer = Partial<Record<QualityItem, URLItem>>;

export type Action = 'get_movie' | 'get_stream' | 'get_episodes';

export type QueryData = {
  id: string;
  translator_id: string;
  season_id: string;
  episode_id: string;
  favs: string;
  action: Action;
};

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
