import { createRoot } from 'react-dom/client';
import { Logger } from '../lib/logger';

globalThis.logger = new Logger('/src/js/settings.js.map');

const element = document.querySelector('body')!;
const root = createRoot(element);

root.render(
  'Settings here...',
  // <App>
  //   <SettingsScreen />
  // </App>,
);
