export enum LogLevel {
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
}

export type LogMessage = {
  timestamp: string;
  level: LogLevel;
  content: any[];
  location: string;
};

export type Message<T> = {
  type: string;
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
  film_id: number;
  translator_id: number;
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
  film_id: number;
  translator_id: number;
  season_id: number;
  episode_id: number;
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
  id: number;
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
