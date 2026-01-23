import { App } from '@/app/App';
import { MyComponent } from '@/app/screens/Logger/Logger';
import { createContext } from 'react';
import { createRoot } from 'react-dom/client';

logger.info('Logger open.');

const element = document.querySelector('#root')!;
const root = createRoot(element);

export const LoggerInitialDataContext = createContext<null | void>(null);

// eventBus.addMessageSource(EventType.StorageChanged, browser.storage.onChanged);

const data = {
  key: 1769170201873,
  value: {
    voiceOver: {
      flag_country: null,
      id: '110',
      is_ads: null,
      is_camrip: null,
      is_director: null,
      prem_content: false,
      title: 'Оригинал',
    },
    quality: '360p',
    subtitle: null,
    favs: '40427b8a-077c-4ff5-a64a-a9f710d7a0ec',
    loadItemIds: [1],
    createdAt: 1769170201873,
  },
};

root.render(
  // <App asyncInitFunction={async () => {}} Context={LoggerInitialDataContext}>
    <MyComponent data={data} />,
  // </App>,
);
