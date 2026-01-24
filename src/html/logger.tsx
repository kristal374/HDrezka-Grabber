import { App } from '@/app/App';
import { MyApp } from '@/app/screens/Logger/Logger';
import {
  loggerInit,
  LoggerInitData,
} from '@/app/screens/Logger/initialization';
import { EventType } from '@/lib/types';
import { createContext } from 'react';
import { createRoot } from 'react-dom/client';

logger.info('Logger open.');

const element = document.querySelector('#root')!;
const root = createRoot(element);

export const SettingsInitialDataContext =
  createContext<LoggerInitData | null>(null);

eventBus.addMessageSource(EventType.StorageChanged, browser.storage.onChanged);
eventBus.addMessageSource(EventType.DBDeletedEvent, globalThis);

root.render(
  <App asyncInitFunction={loggerInit} Context={SettingsInitialDataContext}>
    <MyApp />
  </App>,
);
