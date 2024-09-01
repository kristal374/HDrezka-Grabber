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
}

export type Message<T> = {
    type: string;
    message: T;
}

export interface SourceMap {
    version: number;
    file: string;
    sources: string[];
    sourcesContent: string[];
    names: string[];
    mappings: string;
}


export type PageType =
    'DEFAULT'
    | 'FILM'
    | 'SERIAL'
    | 'TRAILER'
    | 'LOCATION_FILM'
    | 'LOCATION_SERIAL'
    | 'UNAVAILABLE'
    | 'ERROR'

export type MovieInfo = {
    film_id: number;
    translator_id: number;
    season_id?: number;
    episode_id?: number;
    is_camrip?: string,
    is_director?: string,
    is_ads?: string,
    favs: string;
    action: string
    local_film_name: string;
    original_film_name: string | undefined;
    streams: string;
}

export type SubtitleInfo = {
    subtitle: boolean | string;
    subtitle_def: boolean | string;
    subtitle_lns: boolean | { [key: string]: string };
}
