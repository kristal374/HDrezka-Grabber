import browser from 'webextension-polyfill';

import { hashCode } from '@/lib/utils';
import { LogLevel, LogMessage } from './types';

let lastCallTime: number = 0;

/**
 * Подготавливает строку времени в удобочитаемый формат -
 * количество времени прошедшего с момента последнего вызова
 */
export function toFormatTime(time: number, base: number): string {
  const pad = (value: number, length: number): string =>
    value.toString().padStart(length, '0');

  const diff = !!base ? time - base : null;

  if (diff === null || diff < 0 || diff >= 60 * 1000) {
    const hour = Math.floor(time / (60 * 60 * 1000)) % 24;
    const minute = Math.floor(time / (60 * 1000)) % 60;
    const second = Math.floor(time / 1000) % 60;
    const millisecond = time % 1000;

    return `${pad(hour, 2)}:${pad(minute, 2)}:${pad(second, 2)}.${pad(millisecond, 3)}`;
  }
  const minutes = Math.floor(diff / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);
  const milliseconds = diff % 1000;

  return `+${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(milliseconds, 3)}`.padStart(
    12,
    ' ',
  );
}

export function printLog(message: LogMessage) {
  // Вывод цветного сообщения в консоль
  const timestamp = toFormatTime(message.timestamp, lastCallTime);
  const extensionDomain = browser.runtime.getURL('src/');
  const location = `${extensionDomain}${message.location}`;

  if (typeof browser.runtime.getBrowserInfo === 'function') {
    printLogForFirefox(message, timestamp, location);
  } else {
    printLogForChrome(message, timestamp, location);
  }
  lastCallTime = message.timestamp;
}

function printLogForChrome(
  message: LogMessage,
  timestamp: string,
  location: string,
) {
  // Специфическая функция вывода в консоль для Chrome. Разукрашивает сообщение
  const colorReset = '\x1b[0m';
  const colorTime = '\x1b[32m';
  let colorLevel!: string;

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
    default:
      colorLevel = '';
  }
  console.log(
    `${colorTime}${timestamp}${colorReset} | ${colorLevel}${LogLevel[message.level].padEnd(8)}${colorReset} | ${location} -`,
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
  let colorLevel!: string;

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
    default:
      colorLevel = '';
  }
  console.log(
    `%c${timestamp}%c | %c${LogLevel[message.level].padEnd(8)}%c | %c${location}%c - `,
    colorTime,
    colorReset,
    colorLevel,
    colorReset,
    colorLink,
    colorReset,
    ...message.message,
  );
}

export function cloneMessage(message: any[]): any[] {
  return message.map((value) => {
    if (value instanceof Error) return value;
    return JSON.parse(JSON.stringify(value));
  });
}

export function isBackground() {
  const isCurrentPathname = (path: string | undefined) => {
    if (!path) return false;

    try {
      const { pathname } = new URL(path, location.origin);
      return pathname === location.pathname;
    } catch {
      return false;
    }
  };

  const manifest = browser.runtime.getManifest();

  let background = manifest.background;
  switch (manifest.manifest_version) {
    case 1:
      return isCurrentPathname(background?.page);
    case 2:
      return Boolean(
        background?.scripts &&
        isCurrentPathname('/_generated_background_page.html'),
      );
    case 3:
      return isCurrentPathname(background?.service_worker);
    default:
      return false;
  }
}

export function getTraceId() {
  return hashCode(crypto.randomUUID());
}

function makeSession() {
  const sessionId = getTraceId();
  return () => sessionId;
}

export const getSessionId = makeSession();
