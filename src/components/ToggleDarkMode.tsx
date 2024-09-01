import { useEffect, useState } from 'react';
import { getFromStorage, setToStorage } from '../lib/storage';

export function ToggleDarkMode() {
  const [darkMode, setDarkMode] = useState(true);
  useEffect(() => {
    getFromStorage<boolean>('darkMode').then(setDarkMode);
  }, []);
  return (
    <button
      className='bg-red-600 text-white p-2 rounded-xl'
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
