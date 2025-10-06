import { App } from '@/app/App';
import { store } from '@/app/screens/Popup/DownloadScreen/store/store';
import { popupInit, PopupInitData } from '@/app/screens/Popup/initialization';
import { RestorePopupState } from '@/app/screens/Popup/RestorePopupState';
import { Router } from '@/app/screens/Popup/Router';
import { Layout } from '@/components/Layout';
import { EventType } from '@/lib/types';
import { createContext } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

logger.info('Popup open.');

const element = document.querySelector('body')!;
const root = createRoot(element);

export const PopupInitialDataContext = createContext<PopupInitData | null>(
  null,
);

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
  <Provider store={store}>
    <Layout>
      <App asyncInitFunction={popupInit} Context={PopupInitialDataContext}>
        <RestorePopupState>
          <Router />
        </RestorePopupState>
      </App>
    </Layout>
  </Provider>,
);
