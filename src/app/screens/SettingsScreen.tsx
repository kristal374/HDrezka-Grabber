import { ToggleDarkMode } from '../../components/ToggleDarkMode';
import { useEffect, useState } from 'react';
import { getFromStorage, setToStorage } from '../../lib/storage';

export function SettingsScreen() {
  return (
    <div className='flex size-full flex-col gap-3'>
      <h1>Settings</h1>
      <ToggleDebugMode />
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

function ToggleDebugMode() {
  const [debugMode, setDebugMode] = useState(true);

  useEffect(() => {
    getFromStorage<boolean>('debugFlag').then(setDebugMode);
  }, []);

  return (
    <button
      className='rounded-lg bg-red-700 p-2 text-white'
      onClick={async () => {
        const state = !debugMode;
        setDebugMode(state);
        await setToStorage('debugFlag', state);
      }}
    >
      Debug mode: {String(debugMode)}
    </button>
  );
}
