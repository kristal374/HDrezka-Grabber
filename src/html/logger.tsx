import { App } from '@/app/App';
import {
  loggerInit,
  LoggerInitData,
} from '@/app/screens/Logger/initialization';
import { MyApp } from '@/app/screens/Logger/Logger';
import { EventType } from '@/lib/types';
import { createContext } from 'react';
import { createRoot } from 'react-dom/client';

logger.info('Logger open.');

const element = document.querySelector('#root')!;
const root = createRoot(element);

export const LoggerInitialDataContext = createContext<LoggerInitData | null>(
  null,
);

eventBus.addMessageSource(EventType.StorageChanged, browser.storage.onChanged);
eventBus.addMessageSource(EventType.DBDeletedEvent, globalThis);

root.render(
  <App asyncInitFunction={loggerInit} Context={LoggerInitialDataContext}>
    <MyApp />
  </App>,
);
