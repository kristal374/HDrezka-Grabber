import messages from './src/_locales/ru/messages.json';
import Browser from 'webextension-polyfill';
import { Logger } from './src/lib/logger';

type OverrideBrowser = typeof Browser & {
  i18n: {
    getMessage: (
      messageName: keyof typeof messages,
      substitutions?: string | string[],
    ) => string;
  };
};

declare global {
  const browser: OverrideBrowser;
  const logger: Logger;
}
