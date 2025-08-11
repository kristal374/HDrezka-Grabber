import { createRoot } from 'react-dom/client';
import '../lib/logger';

const element = document.querySelector('body')!;
const root = createRoot(element);

root.render(
  'Settings here...',
  // <App>
  //   <SettingsScreen />
  // </App>,
);
