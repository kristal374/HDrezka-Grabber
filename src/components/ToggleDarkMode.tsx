import { useEffect, useState } from 'react';
import { getFromStorage, setToStorage } from '../lib/storage';

export function ToggleDarkMode() {
  const [darkMode, setDarkMode] = useState(true);
  useEffect(() => {
    getFromStorage<boolean>('darkMode').then(setDarkMode);
  }, []);
  return (
    <button
      className='rounded-lg bg-red-700 p-2 text-white'
      onClick={async () => {
        document.documentElement.classList.toggle('light');
        const state = !document.documentElement.classList.contains('light');
        setDarkMode(state);
        await setToStorage('darkMode', state);
      }}
    >
      Dark mode: {String(darkMode)}
    </button>
  );
}
