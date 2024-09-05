import { createRoot } from 'react-dom/client';
import { App } from '../app/App';
import { Router } from '../app/Router';
import { Layout } from '../components/Layout';
import { createDefaultSettings, getFromStorage } from '../lib/storage';

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
      <Router />
    </Layout>
  </App>,
);
