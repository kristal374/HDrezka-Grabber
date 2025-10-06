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

const element = document.querySelector('body')!;
element.classList.add('bg-settings-background-primary', 'overflow-y-scroll');
const root = createRoot(element);

export const SettingsInitialDataContext =
  createContext<SettingsInitData | null>(null);

eventBus.addMessageSource(EventType.StorageChanged, browser.storage.onChanged);
eventBus.addMessageSource(
  EventType.PermissionAdded,
  browser.permissions.onAdded,
);
eventBus.addMessageSource(
  EventType.PermissionRemoved,
  browser.permissions.onRemoved,
);

root.render(
  <App asyncInitFunction={settingsInit} Context={SettingsInitialDataContext}>
    <Settings />
  </App>,
);
