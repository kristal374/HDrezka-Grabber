import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { SettingsScreen } from '../app/screens/SettingsScreen/SettingsScreen';
import '../lib/logger';

const element = document.querySelector('body')!;
const root = createRoot(element);

document.documentElement.classList.add('dark');
element.classList.add('bg-settings-background-primary', 'overflow-y-scroll');
// TODO: Тему на тостах инвертировать от глобальной
root.render(
  <>
    <Toaster
      position='bottom-right'
      expand={true}
      richColors
      duration={10000}
      theme='light'
    />
    <SettingsScreen />
  </>,
);
