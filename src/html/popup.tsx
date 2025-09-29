import { createContext } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from '../app/App';
import { init, InitData } from '../app/initialization';
import { RestorePopupState } from '../app/RestorePopupState';
import { Router } from '../app/Router';
import { Layout } from '../components/Layout';
import { doDatabaseStuff } from '../lib/idb-storage';
import { store } from '../store';

logger.info('Popup open.');
// TODO: Пересмотреть место открытия БД
doDatabaseStuff().then((db) => {
  globalThis.indexedDBObject = db;
  logger.info('Database open.');
});

const element = document.querySelector('body')!;
const root = createRoot(element);

export const InitialDataContext = createContext<InitData | null>(null);

root.render(
  <Provider store={store}>
    <Layout>
      <App asyncInitFunction={init()} Context={InitialDataContext}>
        <RestorePopupState>
          <Router />
        </RestorePopupState>
      </App>
    </Layout>
  </Provider>,
);
