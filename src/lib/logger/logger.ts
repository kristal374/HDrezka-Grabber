import browser from 'webextension-polyfill';

import { SourceMapParser } from '@/lib/logger/source-map';
import { LogLevel, LogMessage } from '@/lib/logger/types';
import { SourceMap } from 'rollup';
import { Message } from '../types';

export class Logger {
  private sourcemap: Record<string, Promise<SourceMapParser | null>> = {};

  private async initializeSourceMapParser(url: string) {
    // Определяем необходимый файл с картой исходного кода для текущего URL,
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
    try {
      // Для обеспечения корректности времени вызова функции логирования
      // мы должны получать время до момента начала работы остальной логики
      const timestamp = new Date().getTime();

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

      const log: LogMessage = { timestamp, level, context, message, location };
      this.sendLogMessage(log);
    } catch (e) {
      // Любые ошибки в логировании не должны влиять на работу расширения
      console.error(e);
    }
  }

  private sendLogMessage(detail: LogMessage) {
    const messageToSend: Message<LogMessage> = {
      type: 'logCreate',
      message: detail,
    };

    // catch необходим на случай, если не существует других контекстов, которые
    // могли бы слушать сообщения, для отлова ошибок об отсутствие ответа
    browser.runtime.sendMessage(messageToSend).catch(() => {});

    // browser.runtime.sendMessage не отправляет сообщения в контекст,
    // из которого вызывается, и если мы хотим так же получать сообщения
    // в этом контексте, мы должны отправить сообщение другим способом,
    // в данном случае это CustomEvent
    globalThis.dispatchEvent(new CustomEvent(messageToSend.type, { detail }));
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
    const sourcemap = await this.initializeSourceMapParser(callerURL);
    const extensionDomain = browser.runtime.getURL('');
    const location =
      sourcemap === null ? callerURL : sourcemap.getOriginalURL(callerURL);
    return [context, location.replace(extensionDomain, '')] as const;
  }
}
