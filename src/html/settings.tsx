import { createRoot } from 'react-dom/client';
import { App } from '../app/App';
import { SettingsScreen } from '../app/screens/SettingsScreen';
import { Logger } from '../lib/logger';

globalThis.logger = new Logger('/src/js/settings.js.map');

const element = document.querySelector('body')!;
const root = createRoot(element);

root.render(
  <App>
    <SettingsScreen />
  </App>,
);
