import browser from 'webextension-polyfill';

import type { SourceMap } from '@/lib/logger/types';

type CallPosition = {
  source: string;
  line: number;
  column: number;
  name?: string;
};

export class SourceMapParser {
  private readonly mappings: number[][][];
  private readonly sources: string[];
  private readonly names: string[];
  private readonly cache: Record<string, CallPosition>;
  private readonly base64Chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  constructor(sourceMap: SourceMap) {
    this.cache = {};
    this.sources = sourceMap.sources;
    this.names = sourceMap.names;
    this.mappings = this.parseMappings(sourceMap.mappings);
  }

  private decodeBase64Char(char: string): number {
    const index = this.base64Chars.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base64 character: ${char}`);
    }
    return index;
  }

  private decodeVLQSegment(segment: string): number[] {
    const result: number[] = [];
    let shift = 0;
    let value = 0;
    let continuation = false;

    for (let i = 0; i < segment.length; i++) {
      const decodedValue = this.decodeBase64Char(segment[i]);
      continuation = !!(decodedValue & 32);
      let digit = decodedValue & 31;

      value += digit << shift;

      if (!continuation) {
        const shouldNegate = value & 1;
        value >>= 1;
        if (shouldNegate) {
          value = -value;
        }
        result.push(value);
        value = shift = 0;
      } else {
        shift += 5;
      }
    }

    return result;
  }

  private parseMappings(mappings: string): number[][][] {
    const lines = mappings.split(';');
    const parsedMappings: number[][][] = [];

    let previousGeneratedColumn = 0;
    let previousSource = 0;
    let previousSourceLine = 0;
    let previousSourceColumn = 0;
    let previousName = 0;

    for (const line of lines) {
      const segments = line.split(',');
      const parsedLine: number[][] = [];
      previousGeneratedColumn = 0;

      for (const segment of segments) {
        if (segment === '') {
          continue;
        }

        const decodedSegment = this.decodeVLQSegment(segment);
        let generatedColumn = previousGeneratedColumn + decodedSegment[0];
        previousGeneratedColumn = generatedColumn;

        const resultSegment: number[] = [generatedColumn];

        if (decodedSegment.length > 1) {
          let source = previousSource + decodedSegment[1];
          previousSource = source;

          let sourceLine = previousSourceLine + decodedSegment[2];
          previousSourceLine = sourceLine;

          let sourceColumn = previousSourceColumn + decodedSegment[3];
          previousSourceColumn = sourceColumn;

          resultSegment.push(source, sourceLine, sourceColumn);

          if (decodedSegment.length > 4) {
            let name = previousName + decodedSegment[4];
            previousName = name;
            resultSegment.push(name);
          }
        }

        parsedLine.push(resultSegment);
      }

      parsedMappings.push(parsedLine);
    }

    return parsedMappings;
  }

  public getOriginalPosition(
    line: number,
    column: number,
  ): CallPosition | null {
    const cashIndex = `${line}:${column}`;
    if (this.cache[cashIndex]) return this.cache[cashIndex];
    if (line - 1 >= this.mappings.length) return null;

    const segments = this.mappings[line - 1];
    for (const segment of segments) {
      const [
        generatedColumn,
        sourceIndex,
        sourceLine,
        sourceColumn,
        nameIndex,
      ] = segment;
      if (generatedColumn === column - 1) {
        const result = {
          source: this.sources[sourceIndex],
          line: sourceLine + 1,
          column: sourceColumn + 1,
          name: this.names[nameIndex],
        };

        this.cache[cashIndex] = result;
        return result;
      }
    }

    return null;
  }

  public getOriginalURL(url: string): string {
    const regexFindURL =
      /((?:chrome|moz)-extension:\/(?:\/.*?)+\.js:(\d+):(\d+))/;
    const [_browser, _path, line, column] = regexFindURL.exec(url)!;
    const originalSource = this.getOriginalPosition(
      parseInt(line),
      parseInt(column),
    );

    if (!originalSource) return url;
    return this.urlToFormat(
      originalSource!.source,
      originalSource!.line,
      originalSource!.column,
    );
  }

  private urlToFormat(path: string, line?: number, column?: number) {
    const rawPath = path.replaceAll('../', '');
    return browser.runtime.getURL(rawPath) + `:${line}:${column}`;
  }

  public normalizeStackTrace(stacktrace: string): string {
    const allUrl = stacktrace.matchAll(
      /(?:chrome|moz)-extension:\/(?:\/.*?)+\.js:(\d+):(\d+)/g,
    );
    for (const url of allUrl) {
      stacktrace = stacktrace.replace(url[0], this.getOriginalURL(url[0]));
    }
    return stacktrace;
  }
}
