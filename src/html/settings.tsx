import { createContext } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { App } from '../app/App';
import { Settings } from '../app/screens/Settings/Settings';
import {
  settingsInit,
  SettingsInitData,
} from '../app/screens/Settings/initialization';

const element = document.querySelector('body')!;
const root = createRoot(element);

document.documentElement.classList.add('dark');
element.classList.add('bg-settings-background-primary', 'overflow-y-scroll');
// TODO: Тему на тостах инвертировать от глобальной

export const SettingsInitialDataContext =
  createContext<SettingsInitData | null>(null);

root.render(
  <App asyncInitFunction={settingsInit()} Context={SettingsInitialDataContext}>
    <Toaster
      position='bottom-right'
      expand={true}
      richColors
      duration={10000}
      theme='light'
    />
    <Settings />
  </App>,
);
