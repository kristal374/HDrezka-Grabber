import { createRoot } from 'react-dom/client';
import { SettingsScreen } from '../app/screens/SettingsScreen/SettingsScreen';
import '../lib/logger';

const element = document.querySelector('body')!;
const root = createRoot(element);

document.documentElement.classList.add('dark');
element.classList.add('bg-settings-background-primary', 'overflow-y-scroll');
root.render(<SettingsScreen />);
