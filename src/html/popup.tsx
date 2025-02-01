import { createRoot } from 'react-dom/client';
import { App } from '../app/App';
import { Router } from '../app/Router';
import { Logger } from '../lib/logger';

globalThis.logger = new Logger('/src/js/popup.js.map');

logger.info('Start rendering');

const element = document.querySelector('body')!;
const root = createRoot(element);

root.render(
  <App>
    <Router />
  </App>,
);
