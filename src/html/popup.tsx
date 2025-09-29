import { createContext } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from '../app/App';
import { store } from '../app/screens/Popup/DownloadScreen/store/store';
import { popupInit, PopupInitData } from '../app/screens/Popup/initialization';
import { RestorePopupState } from '../app/screens/Popup/RestorePopupState';
import { Router } from '../app/screens/Popup/Router';
import { Layout } from '../components/Layout';
import { doDatabaseStuff } from '../lib/idb-storage';

logger.info('Popup open.');
// TODO: Пересмотреть место открытия БД
doDatabaseStuff().then((db) => {
  globalThis.indexedDBObject = db;
  logger.info('Database open.');
});

const element = document.querySelector('body')!;
const root = createRoot(element);

export const PopupInitialDataContext = createContext<PopupInitData | null>(
  null,
);

root.render(
  <Provider store={store}>
    <Layout>
      <App asyncInitFunction={popupInit()} Context={PopupInitialDataContext}>
        <RestorePopupState>
          <Router />
        </RestorePopupState>
      </App>
    </Layout>
  </Provider>,
);
