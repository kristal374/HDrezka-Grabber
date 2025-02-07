import browser from 'webextension-polyfill';
import { getFromStorage } from './storage';
import { LogLevel, LogMessage, Message, SourceMap } from './types';

const extensionDomain = browser.runtime.getURL('');
let debugFlag: boolean = false;
let lastCallTime: number = 0;

getFromStorage<boolean>('debugFlag').then((storage) => (debugFlag = storage));

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && typeof changes.debugFlag?.newValue === 'boolean') {
    debugFlag = changes.debugFlag?.newValue || false;
  }
});

function toFormatTime(time: number): string {
  // Подготавливает строку времени в удобочитаемый формат -
  // количество времени прошедшего с момента последнего вызова
  const pad = (value: number, length: number): string =>
    value.toString().padStart(length, '0');

  const diff = lastCallTime ? time - lastCallTime : null;
  lastCallTime = time;

  if (diff === null || diff < 0 || diff >= 60 * 1000) {
    const hour = Math.floor(time / (60 * 60 * 1000)) % 24;
    const minute = Math.floor(time / (60 * 1000)) % 60;
    const second = Math.floor(time / 1000) % 60;
    const millisecond = time % 1000;

    return `${pad(hour, 2)}:${pad(minute, 2)}:${pad(second, 2)}:${pad(millisecond, 3)}`;
  }
  const minutes = Math.floor(diff / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);
  const milliseconds = diff % 1000;

  return `+${pad(minutes, 2)}:${pad(seconds, 2)}:${pad(milliseconds, 3)}`.padStart(
    12,
    ' ',
  );
}

export function printLog(message: LogMessage) {
  // Вывод цветное сообщения в консоль
  const timestamp = toFormatTime(message.timestamp);
  const location = `${extensionDomain}${message.location}`;

  if (typeof browser.runtime.getBrowserInfo === 'function') {
    printLogForFirefox(message, timestamp, location);
  } else {
    printLogForChrome(message, timestamp, location);
  }
}

function printLogForChrome(
  message: LogMessage,
  timestamp: string,
  location: string,
) {
  // Специфическая функция вывода в консоль для Chrome. Разукрашивает сообщение
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
    `${colorTime}${timestamp}${colorReset} | ${colorLevel}${message.level.padEnd(8)}${colorReset} | ${location} -`,
    ...message.message,
  );
}

function printLogForFirefox(
  message: LogMessage,
  timestamp: string,
  location: string,
) {
  // Специфическая функция вывода в консоль для Firefox. Разукрашивает сообщение
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
    `%c${timestamp}%c | %c${message.level.padEnd(8)}%c | %c${location}%c - `,
    colorTime,
    colorReset,
    colorLevel,
    colorReset,
    colorLink,
    colorReset,
    ...message.message,
  );
}

export class Logger {
  private sourcemap: Record<string, Promise<SourceMapParser | null>> = {};

  private async initializeSourceMapParser(url: string) {
    // Определяем необходимый файл с картой исходного кода для текущего URL
    // после чего пробуем вернуть соответствующий парсер, если он уже был создан
    // в противном случае создаем его перед этим
    const regexFindURL = /((?:chrome|moz)-extension:\/(?:\/.*?)+\.js):\d+:\d+/;
    const urlSourceMap = `${url.match(regexFindURL)![1]}.map`;

    if (!this.sourcemap[urlSourceMap])
      this.sourcemap[urlSourceMap] = this.getSourceMapParser(urlSourceMap);
    return await this.sourcemap[urlSourceMap];
  }

  private async getSourceMapParser(targetUrl: string) {
    // Создаёт парсер исходной карты кода
    try {
      const response = await fetch(targetUrl);
      const sourceMap: SourceMap = await response.json();
      return new SourceMapParser(sourceMap);
    } catch (e) {
      return null;
    }
  }

  private async emit(level: LogLevel, message: any[]) {
    // Основная функция логирования, создаёт сообщение и отправляет его
    // в остальные части расширения, включая текущий контекст
    if (!debugFlag) return;

    try {
      const timestamp = new Date().getTime();
      const [context, location] = await this.getCallerInfo();
      const log: LogMessage = { timestamp, level, context, message, location };
      const messageToSend: Message<LogMessage> = {
        type: 'logCreate',
        message: log,
      };
      const event: CustomEventInit = {
        detail: log,
      };
      browser.runtime.sendMessage(messageToSend).catch(() => {});
      // browser.runtime.sendMessage не отправляет сообщения в контекст
      // из которого вызывается и если мы хотим так же получать сообщения
      // в этом контексте мы должны отправить сообщение другим способом,
      // в данном случае это CustomEvent
      globalThis.dispatchEvent(new CustomEvent('logCreate', event));
    } catch (e) {
      // Любые ошибки в логировании не должны влиять на работу расширения
      console.error(e);
    }
  }

  critical(...message: any[]) {
    this.emit(LogLevel.CRITICAL, message);
  }

  error(...message: any[]) {
    this.emit(LogLevel.ERROR, message);
  }

  warning(...message: any[]) {
    this.emit(LogLevel.WARNING, message);
  }

  debug(...message: any[]) {
    this.emit(LogLevel.DEBUG, message);
  }

  info(...message: any[]) {
    this.emit(LogLevel.INFO, message);
  }

  private async getCallerInfo() {
    // Возвращает информацию о конкретном месте вызова функции логирования
    const exception = new Error();
    const urlStackTrace = exception.stack!.match(
      /((?:chrome|moz)-extension:\/(?:\/.*?)+\.js:(\d+):(\d+))/g,
    )!;

    // Число 3 здесь потому что перед этим было ровно 3 вызова других функций
    // от места вызова функции логирования
    const callerURL = urlStackTrace[3];

    const context = callerURL.split('/').at(-1)!.split('.')[0];
    const sourcemap = await this.initializeSourceMapParser(callerURL);
    const location =
      sourcemap === null ? callerURL : sourcemap.getOriginalURL(callerURL);
    return [context, location.replace(extensionDomain, '')];
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
          name:
            (nameIndex as number | undefined) !== undefined
              ? this.names[nameIndex]
              : undefined,
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
}
