import type { MovieInfo } from '@/lib/types';

export async function getMovieInfo(tabId: number) {
  const pathToInjectScript = browser.runtime.getURL(
    'src/js/InjectionScripts/extractMovieInfo.js',
  );
  return await browser.scripting
    .executeScript({
      target: { tabId },
      func: extractMovieInfo,
      args: [pathToInjectScript],
    })
    .then((response) => {
      return response[0].result as MovieInfo | null;
    });
}

function extractMovieInfo(pathToInjectScript: string) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = pathToInjectScript;
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
      reject('Movie info extraction timeout.');
    }, 1000);
  });
}
