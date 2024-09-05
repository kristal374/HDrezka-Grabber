import { ToggleDarkMode } from '../components/ToggleDarkMode';

export function SettingsPage() {
  return (
    <div className='flex size-full flex-col gap-3'>
      <h1>Settings</h1>
      <ToggleDarkMode />
    </div>
  );
}
