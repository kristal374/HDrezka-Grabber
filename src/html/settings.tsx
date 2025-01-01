import { createRoot } from 'react-dom/client';
import { App } from '../app/App';
import { getFromStorage } from '../lib/storage';
import { SettingsScreen } from '../app/screens/SettingsScreen';
import { Layout } from '../components/Layout';

// await createDefaultSettings();

const darkMode: boolean = await getFromStorage('darkMode');

if (!darkMode) {
  document.documentElement.classList.add('light');
}

const element = document.querySelector('body')!;
const root = createRoot(element);
root.render(
  <App>
    <Layout>
      <SettingsScreen />
    </Layout>
  </App>,
);
