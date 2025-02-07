import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from '../app/App';
import { Router } from '../app/Router';
import { Logger } from '../lib/logger';
import { store } from '../store';

globalThis.logger = new Logger();

logger.info('Popup open.');

const element = document.querySelector('body')!;
const root = createRoot(element);

root.render(
  <Provider store={store}>
    <App>
      <Router />
    </App>
  </Provider>,
);
