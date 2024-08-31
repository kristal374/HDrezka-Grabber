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
    text: string;
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