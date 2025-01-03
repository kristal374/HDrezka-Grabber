import { ToggleDarkMode } from '../../components/ToggleDarkMode';

export function SettingsScreen() {
  return (
    <div className='flex size-full flex-col gap-3'>
      <h1>Settings</h1>
      <ToggleDarkMode />
      <button
        className='rounded-lg bg-red-700 p-2 text-white'
        onClick={async () => await browser.storage.local.clear()}
      >
        Clear storage
      </button>
    </div>
  );
}
