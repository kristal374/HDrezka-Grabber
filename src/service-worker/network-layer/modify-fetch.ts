import { Logger } from '@/lib/logger';
import { hashCode } from '@/lib/utils';

const inFlightFetches = new Map<string, AbortController>();

export function makeModifyFetch({
  sourceUrl,
  logger = globalThis.logger,
}: {
  sourceUrl?: string | URL;
  logger?: Logger;
}): [() => string, typeof fetch] {
  let finallyUrl: string;
  return [
    () => finallyUrl,
    async (input: string | URL | Request, init?: RequestInit) => {
      logger.debug('Fetch query:', input, init);
      const ruleId = await addHeaderModificationRule(input, sourceUrl);

      const controller = new AbortController();
      const combinedSignal = init?.signal
        ? combineSignals(init.signal, controller.signal)
        : controller.signal;

      // Добавляем к активным запросам новый
      inFlightFetches.set(urlToString(input), controller);

      const timeout = setTimeout(() => controller.abort('Timeout.'), 10_000);
      return await fetch(input, {
        ...init,
        signal: combinedSignal,
      })
        .then((response) => {
          finallyUrl = response.url;
          clearTimeout(timeout);
          return response;
        })
        .catch(async (e) => {
          const error = e as Error;
          logger.error(error.toString());
          throw error;
        })
        .finally(async () => {
          inFlightFetches.delete(urlToString(input));
          await removeHeaderModificationRule(ruleId);
        });
    },
  ];
}

export function urlToString(input: string | URL | Request) {
  return !(input instanceof Request)
    ? input instanceof URL
      ? input.href
      : input
    : input.url;
}

export function abortFetch(input: string | URL | Request) {
  const url = urlToString(input);
  const controller = inFlightFetches.get(url);
  if (!controller || controller.signal.aborted) return;
  controller.abort('Canceled.');
}

export function abortAllFetches(reason: string = 'Canceled.') {
  inFlightFetches.forEach((signal) => signal.abort(reason));
}

function combineSignals(...signals: AbortSignal[]): AbortSignal {
  if (signals.length === 1) return signals[0];
  const mainController = new AbortController();

  const abortHandler = (event: Event) => {
    const signal = event.target as AbortSignal;
    mainController.abort(`Signal aborted: ${signal.reason}`);
    signals.forEach((s) => s.removeEventListener('abort', abortHandler));
  };

  signals.forEach((signal) => {
    if (signal.aborted) {
      mainController.abort(signal.reason);
    } else {
      signal.addEventListener('abort', abortHandler);
    }
  });

  return mainController.signal;
}

export async function addHeaderModificationRule(
  targetUrl: string | URL | Request,
  sourceUrl?: string | URL,
) {
  const target = !(targetUrl instanceof Request)
    ? targetUrl instanceof URL
      ? targetUrl
      : new URL(targetUrl)
    : new URL(targetUrl.url);
  const source = !(sourceUrl instanceof URL)
    ? typeof sourceUrl !== 'undefined'
      ? new URL(sourceUrl)
      : undefined
    : sourceUrl;

  const isMediaFile = /\.mp4|\.m3u8|\.vtt/.test(target.pathname);
  const isSubtitleFile = /\.vtt/.test(target.pathname);

  const origin = (source ?? target).origin;
  const referer = isMediaFile ? `${origin}/` : target.href;
  const secFetchSite = isMediaFile ? 'cross-site' : 'same-origin';
  const secFetchDest = isMediaFile && !isSubtitleFile ? 'video' : 'empty';

  const ruleId = hashCode(
    `${target.href}-${new Date().getTime()}-${Math.random()}`,
  );
  await browser.declarativeNetRequest.updateSessionRules({
    addRules: [
      {
        id: ruleId,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            {
              header: 'Referer',
              operation: 'set',
              value: referer,
            },
            {
              header: 'Origin',
              operation: 'set',
              value: origin,
            },
            {
              header: 'Sec-Fetch-Site',
              operation: 'set',
              value: secFetchSite,
            },
            {
              header: 'Sec-Fetch-Dest',
              operation: 'set',
              value: secFetchDest,
            },
          ],
        },
        // TODO: Стоит использовать Regexp дабы не зависеть от домена при медиа запросах
        condition: { urlFilter: target.href },
      },
    ],
    removeRuleIds: [ruleId],
  });
  return ruleId;
}

export async function removeHeaderModificationRule(ruleId: number) {
  await browser.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [ruleId],
  });
}
