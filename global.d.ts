import { Browser } from "webextension-polyfill";
import messages from "./src/_locales/en/messages.json";

declare global {
    // interface Window {
    //     browser: Browser;
    // }
    let browser: Browser;

    namespace I18n {
        interface Static {
            getMessage(
                messageName: keyof typeof messages,
                substitutions?: string[] | string
            ): string;
        }
    }
}
