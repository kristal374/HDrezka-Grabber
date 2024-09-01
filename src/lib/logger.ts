import browser from 'webextension-polyfill';
import { LogLevel, LogMessage, Message, SourceMap } from '../lib/types';

let debugFlag: boolean;

browser.storage.local
  .get(['debugFlag'])
  .then((storage) => (debugFlag = storage.debugFlag as boolean));

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && typeof changes.debugFlag?.newValue === 'boolean') {
    debugFlag = changes.debugFlag!.newValue;
  }
});

export function printLog(message: LogMessage) {
  message.timestamp = new Date(message.timestamp).toLocaleString();

  if (typeof browser.runtime.getBrowserInfo === 'function') {
    printLogForFirefox(message);
  } else {
    printLogForChrome(message);
  }
}

function printLogForChrome(message: LogMessage) {
  const colorReset = '\x1b[0m';
  const colorTime = '\x1b[32m';
  let colorLevel = '';

  switch (message.level) {
    case LogLevel.CRITICAL:
      colorLevel = '\x1b[1;37;41m';
      break;
    case LogLevel.ERROR:
      colorLevel = '\x1b[31m';
      break;
    case LogLevel.WARNING:
      colorLevel = '\x1b[33m';
      break;
    case LogLevel.INFO:
      colorLevel = '\x1b[37m';
      break;
    case LogLevel.DEBUG:
      colorLevel = '\x1b[34m';
      break;
  }
  console.log(
    `${colorTime}${message.timestamp}${colorReset} | ${colorLevel}${message.level}${colorReset} | ${message.location} - `,
    ...message.content,
  );
}

function printLogForFirefox(message: LogMessage) {
  const colorReset = 'color: inherit;';
  const colorTime = 'color: green;';
  const colorLink = 'color: #007bff; text-decoration: underline';
  let colorLevel = '';
  switch (message.level) {
    case LogLevel.CRITICAL:
      colorLevel = 'font-weight: bold; background-color: red; color: white;';
      break;
    case LogLevel.ERROR:
      colorLevel = 'color: red;';
      break;
    case LogLevel.WARNING:
      colorLevel = 'color: yellow;';
      break;
    case LogLevel.INFO:
      colorLevel = 'color: inherit;';
      break;
    case LogLevel.DEBUG:
      colorLevel = 'color: blue;';
      break;
  }
  console.log(
    `%c${message.timestamp}%c | %c${message.level}%c | %c${message.location}%c - `,
    colorTime,
    colorReset,
    colorLevel,
    colorReset,
    colorLink,
    colorReset,
    ...message.content,
  );
}

function checkingDebugFlag(
  _target: any,
  _key: string | symbol,
  descriptor: PropertyDescriptor,
): any {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]): undefined {
    if (debugFlag) {
      return originalMethod.apply(this, args);
    } else return undefined;
  };

  return descriptor;
}

export class Logger {
  private sourcemap!: SourceMapParser;

  constructor(url?: string) {
    if (!!url) this.init(url).then();
  }

  public static async create(url: string): Promise<Logger> {
    const logger = new Logger();
    await logger.init(url);
    return logger;
  }

  async init(url: string) {
    const fileUrl = browser.runtime.getURL(url);
    const response = await fetch(fileUrl);
    const file = await response.json();
    this.sourcemap = new SourceMapParser(file);
  }

  private emit(level: LogLevel, message: any[]) {
    const log: LogMessage = {
      timestamp: new Date().toString(),
      level: level,
      content: message,
      location: this.getCallerInfo(),
    };
    const messageToSend: Message<LogMessage> = {
      type: 'logCreate',
      message: log,
    };
    const event: CustomEventInit = {
      detail: log,
    };
    browser.runtime.sendMessage(messageToSend).then();
    globalThis.dispatchEvent(new CustomEvent('logCreate', event));
  }

  @checkingDebugFlag
  critical(...message: any[]) {
    this.emit(LogLevel.CRITICAL, message);
  }

  @checkingDebugFlag
  error(...message: any[]) {
    this.emit(LogLevel.ERROR, message);
  }

  @checkingDebugFlag
  warning(...message: any[]) {
    this.emit(LogLevel.WARNING, message);
  }

  @checkingDebugFlag
  debug(...message: any[]) {
    this.emit(LogLevel.DEBUG, message);
  }

  @checkingDebugFlag
  info(...message: any[]) {
    this.emit(LogLevel.INFO, message);
  }

  private getCallerInfo() {
    const exception = new Error();
    const regexFindURL =
      /((?:chrome|moz)-extension:\/(?:\/.*?)+\.js:(\d+):(\d+))/g;
    const urlStackTrace = exception.stack!.match(regexFindURL);
    const callerURL = urlStackTrace![4];
    return this.sourcemap.getOriginalURL(callerURL);
  }
}

class SourceMapParser {
  private readonly mappings: number[][][];
  private readonly sources: string[];
  private readonly names: string[];
  private readonly cash: {
    [key: string]: {
      source: string;
      line: number;
      column: number;
      name?: string;
    };
  };

  constructor(sourceMap: SourceMap) {
    this.cash = {};
    this.sources = sourceMap.sources;
    this.names = sourceMap.names;
    this.mappings = this.parseMappings(sourceMap.mappings);
  }

  private static base64Chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  private static decodeBase64Char(char: string): number {
    const index = SourceMapParser.base64Chars.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base64 character: ${char}`);
    }
    return index;
  }

  private static decodeVLQSegment(segment: string): number[] {
    const result: number[] = [];
    let shift = 0;
    let value = 0;
    let continuation = false;

    for (let i = 0; i < segment.length; i++) {
      const decodedValue = SourceMapParser.decodeBase64Char(segment[i]);
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

        const decodedSegment = SourceMapParser.decodeVLQSegment(segment);
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
  ): {
    source: string;
    line: number;
    column: number;
    name?: string;
  } | null {
    const cashIndex = `${line}:${column}`;
    if (this.cash[cashIndex]) {
      return this.cash[cashIndex];
    }
    if (line - 1 >= this.mappings.length) {
      return null;
    }

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
          name: nameIndex !== undefined ? this.names[nameIndex] : undefined,
        };
        this.cash[cashIndex] = result;
        return result;
      }
    }

    return null;
  }

  public getOriginalURL(url: string): string {
    const regexFindURL =
      /((?:chrome|moz)-extension:\/(?:\/.*?)+\.js:(\d+):(\d+))/;
    const [, , line, column] = regexFindURL.exec(url)!;
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
    return (
      browser.runtime.getURL(path.replaceAll('../', '')) + `:${line}:${column}`
    );
  }

  public normalizeStackTrace(stacktrace: string): string {
    const regexFindURL =
      /(?:chrome|moz)-extension:\/(?:\/.*?)+\.js:(\d+):(\d+)/g;
    const allUrl = stacktrace.matchAll(regexFindURL);
    for (const url of allUrl) {
      stacktrace = stacktrace.replace(url[0], this.getOriginalURL(url[0]));
    }
    return stacktrace;
  }
}
