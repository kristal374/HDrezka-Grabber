import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Router } from './Router';

const element = document.querySelector('body')!;
const root = createRoot(element);
root.render(
  <App>
      <Router />
  </App>,
);
