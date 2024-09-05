import { createRoot } from 'react-dom/client';
import { App } from '../app/App';
import { createDefaultSettings, getFromStorage } from '../lib/storage';
import { SettingsPage } from '../app/SettingsPage';
import { Layout } from '../components/Layout';

// await createDefaultSettings();

const darkMode: boolean = await getFromStorage('darkMode');

if (darkMode === false) {
  document.documentElement.classList.add('light');
}

const element = document.querySelector('body')!;
const root = createRoot(element);
root.render(
  <App>
    <Layout>
      <SettingsPage />
    </Layout>
  </App>,
);
