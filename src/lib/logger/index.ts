import { clearDebounceTimer, logCreate } from './background-logger';
import { attachTraceId } from './decorator';
import { Logger } from './logger';
import type { LogMessage } from './types';
import { LogLevel, LoggerEventType } from './types';
import { getSessionId, getTraceId, printLog, toFormatTime } from './utils';

export {
  LogLevel,
  LogMessage,
  Logger,
  LoggerEventType,
  attachTraceId,
  clearDebounceTimer,
  getSessionId,
  getTraceId,
  logCreate,
  printLog,
  toFormatTime,
};
