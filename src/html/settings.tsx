import { createRoot } from 'react-dom/client';
import { SettingsScreen } from '../app/screens/SettingsScreen';
import '../lib/logger';

const element = document.querySelector('body')!;
const root = createRoot(element);

document.documentElement.classList.add('light');
element.style.backgroundColor = 'var(--settings-background)';
root.render(<SettingsScreen />);
