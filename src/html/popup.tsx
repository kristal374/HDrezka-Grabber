import { createRoot } from 'react-dom/client';
import { App } from '../app/App';
import { Router } from '../app/Router';
import { Layout } from '../components/Layout';
import { createDefaultSettings, getFromStorage } from '../lib/storage';
import { Logger } from '../lib/logger';

globalThis.logger = new Logger('/src/js/popup.js.map');
logger.info('Popup open.');
await createDefaultSettings();

const darkMode: boolean = await getFromStorage('darkMode');
logger.debug('darkMode:', darkMode);

if (!darkMode) {
  document.documentElement.classList.add('light');
}

const element = document.querySelector('body')!;
const root = createRoot(element);

logger.info('Start rendering.');
root.render(
  <App>
    <Layout>
      <Router />
    </Layout>
  </App>,
);
