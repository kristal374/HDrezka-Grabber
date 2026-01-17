import { App } from '@/app/App';
import { Settings } from '@/app/screens/Settings/Settings';
import {
  settingsInit,
  SettingsInitData,
} from '@/app/screens/Settings/initialization';
import { EventType } from '@/lib/types';
import { createContext } from 'react';
import { createRoot } from 'react-dom/client';

logger.info('Settings open.');

const element = document.querySelector('#root')!;
const root = createRoot(element);

export const SettingsInitialDataContext =
  createContext<SettingsInitData | null>(null);

eventBus.addMessageSource(EventType.StorageChanged, browser.storage.onChanged);
eventBus.addMessageSource(
  EventType.NewMessageReceived,
  browser.runtime.onMessage,
);
eventBus.addMessageSource(EventType.DBDeletedEvent, globalThis);

root.render(
  <App asyncInitFunction={settingsInit} Context={SettingsInitialDataContext}>
    <Settings />
  </App>,
);
