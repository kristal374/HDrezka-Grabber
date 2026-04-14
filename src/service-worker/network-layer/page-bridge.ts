import { Logger } from '@/lib/logger';
import { QueryData, ResponseVideoData } from '@/lib/types';

async function tabIsExist(tabId: number) {
  return await browser.tabs
    .get(tabId)
    .then(() => true)
    .catch(() => false);
}

export async function requestDirectlyFromPage({
  tabId,
  url,
  siteUrl,
  body,
  method,
}: {
  tabId: number;
  url: string;
  siteUrl: string;
  body: QueryData;
  method?: string;
  logger: Logger;
}): Promise<ResponseVideoData | { success: false; error: string }> {
  if (!(await tabIsExist(tabId))) {
    // TODO: Переписать более оптимально
    const tabs = await browser.tabs.query({});
    const targetTab = tabs.find((tab) => tab.url?.split('#')[0] === siteUrl);
    if (!targetTab || !targetTab.id) {
      await messageBroker.sendMessage(body.id, {
        type: 'critical',
        message: browser.i18n.getMessage(
          'popup_messageBroker_PageHasBeenClosed',
        ),
        stackable: false,
        unique: true,
      });
      throw new Error(`Tab is not exist ${tabId}`);
    }
    tabId = targetTab.id;
  }

  const pathToInjectScript = browser.runtime.getURL(
    'src/js/InjectionScripts/netRequests.js',
  );
  return await browser.scripting
    .executeScript({
      target: { tabId },
      func: netRequest,
      args: [pathToInjectScript, url, body, method],
    })
    .then((response) => {
      return response[0].result as
        | ResponseVideoData
        | { success: false; error: string };
    });
}

function netRequest(
  pathToInjectScript: string,
  url: string,
  body: QueryData,
  method: 'POST' | 'GET',
) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = pathToInjectScript;
    script.dataset.args = JSON.stringify({ url, body, method });
    document.documentElement.appendChild(script);

    const intervalId = setInterval(() => {
      if (script.dataset.result) {
        clearInterval(intervalId);
        const result = JSON.parse(script.dataset.result);
        document.documentElement.removeChild(script);
        resolve(result);
      }
    }, 10);

    setTimeout(() => {
      clearInterval(intervalId);
      reject('Request timeout.');
    }, 5000);
  });
}
