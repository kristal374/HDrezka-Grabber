import messages from './src/_locales/ru/messages.json';
import Browser from 'webextension-polyfill';

type OverridedBrowser = typeof Browser & {
  i18n: {
    // Override the type for getMessage function
    getMessage: (
      messageName: keyof typeof messages,
      substitutions?: string | string[],
    ) => string;
  };
};

declare global {
  const browser: OverridedBrowser;
}
