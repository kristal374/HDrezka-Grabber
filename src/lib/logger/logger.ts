import browser, { Runtime } from 'webextension-polyfill';

import { SourceMap } from 'rollup';
import { SourceMapParser } from './source-map';
import { LoggerEventType, LogLevel, LogMessage, LogMetadata } from './types';
import { isBackground } from './utils';

export class Logger {
  private static isBackground = isBackground();
  private static port: Runtime.Port | undefined;
  private static sourcemap: Record<string, SourceMapParser | null> = {};
  private readonly _metadata: LogMetadata;

  constructor(metadata: LogMetadata = {}) {
    this._metadata = metadata;
  }

  get metadata(): LogMetadata {
    return this._metadata;
  }

  private combinedMeta(metadata: Partial<LogMetadata>): LogMetadata {
    const result = { ...this.metadata };

    (Object.keys(metadata) as (keyof LogMetadata)[]).forEach((key) => {
      const value = metadata[key];

      if (value === null) {
        delete result[key];
      } else if (value !== undefined) {
        result[key] = value;
      }
    });

    return result;
  }

  private async getOrInitializeSourceMapParser(url: string) {
    // Определяем необходимый файл с картой исходного кода для текущего URL,
    // после чего пробуем вернуть соответствующий парсер, если он уже был создан
    // в противном случае создаем его перед этим
    const regexFindURL = /((?:chrome|moz)-extension:\/(?:\/.*?)+\.js):\d+:\d+/;
    const [_match, rawUrl] = url.match(regexFindURL)!;

    const urlSourceMap = `${rawUrl}.map`;
    if (typeof Logger.sourcemap[urlSourceMap] === 'undefined')
      Logger.sourcemap[urlSourceMap] =
        await this.getSourceMapParser(urlSourceMap);
    return Logger.sourcemap[urlSourceMap];
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
    try {
      // Для обеспечения корректности времени вызова функции логирования
      // мы должны получать время до момента начала работы остальной логики
      const timestamp = Date.now();

      let [context, location] = ['', ''];
      if (typeof settings === 'undefined') {
        // Поскольку невозможно корректно дождаться завершения инициализации
        // переменной enableLogger, не сломав при этом stackTrace, необходимо
        // получить данные о месте вызова до вызова ожидания инициализации
        [context, location] = await this.getCallerInfo();

        // Ждём пока settings появится, если его ещё нет
        while (typeof settings === 'undefined') {
          await new Promise((res) => setTimeout(res, 0));
        }
      }

      if (!settings.enableLogger || settings.debugLevel < level) return;
      [context, location] =
        !context && !location
          ? await this.getCallerInfo()
          : [context, location];

      const metadata = this.metadata;

      message = await Promise.all(
        message.map((m) => (m instanceof Error ? this.getStackTrace(m) : m)),
      );

      this.sendLogMessage({
        timestamp,
        level,
        context,
        message,
        location,
        metadata,
      });
    } catch (e) {
      // Любые ошибки в логировании не должны влиять на работу расширения
      console.error(e);
    }
  }

  private sendLogMessage(detail: LogMessage) {
    if (!Logger.isBackground) {
      if (!Logger.port) {
        Logger.port = browser.runtime.connect();

        const disconnectHandler = () => {
          Logger.port?.onDisconnect.removeListener(disconnectHandler);
          Logger.port = undefined;
        };

        Logger.port.onDisconnect.addListener(disconnectHandler);
      }

      Logger.port.postMessage(detail);
    } else {
      // Для отправки сообщений в контекст, из которого вызывается запись
      // в журнал, мы должны использовать CustomEvent
      globalThis.dispatchEvent(
        new CustomEvent(LoggerEventType.LogCreate, { detail }),
      );
    }
  }

  attachMetadata(
    metadata: Partial<{ [K in keyof LogMetadata]: LogMetadata[K] | null }>,
  ) {
    return new Logger(this.combinedMeta(metadata as LogMetadata));
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
    // Число 3 здесь, потому что перед этим было ровно 3 вызова других функций
    // от места вызова функции логирования
    const callerURL = urlStackTrace[3];

    const context = callerURL.split('/').at(-1)!.split('.')[0];
    const sourcemap = await this.getOrInitializeSourceMapParser(callerURL);
    const extensionDomain = browser.runtime.getURL('src/');
    const location =
      sourcemap === null ? callerURL : sourcemap.getOriginalURL(callerURL);
    return [context, location.replace(extensionDomain, '')] as const;
  }

  private async getStackTrace(error: Error) {
    const exception = new Error();
    const urlStackTrace = exception.stack!.match(
      /((?:chrome|moz)-extension:\/(?:\/.*?)+\.js:(\d+):(\d+))/g,
    )!;
    const callerURL = urlStackTrace[0];

    if (!callerURL) return error.stack;
    const sourcemap = await this.getOrInitializeSourceMapParser(callerURL);
    return sourcemap !== null
      ? sourcemap?.normalizeStackTrace(error.stack!)
      : error.stack;
  }
}
