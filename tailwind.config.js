/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'selector',
  content: ['./src/**/*.{jsx,tsx}'],
  theme: {
    extend: {
      fontSize: {
        base: ['17px', '1.375'],
      },
      colors: {
        foreground: 'var(--text-primary)',
        'foreground-secondary': 'var(--text-secondary)',
        'foreground-disabled': 'var(--text-disabled)',
        'check-box': 'var(--check-box)',
        input: 'var(--input)',
        background: 'var(--background)',
        'popup-border': 'var(--popup-border)',
        error: 'var(--error)',

        'light-color': 'var(--light-color)',
        'link-color': 'var(--link-color)',
      },
    },
  },
  plugins: [],
};
