export interface SourceMap {
  version: number;
  file: string;
  sources: string[];
  sourcesContent: string[];
  names: string[];
  mappings: string;
}

export enum LogLevel {
  CRITICAL,
  ERROR,
  WARNING,
  INFO,
  DEBUG,
}

export type LogMessage = {
  timestamp: number;
  level: LogLevel;
  context: string;
  message: any[];
  location: string;
};
