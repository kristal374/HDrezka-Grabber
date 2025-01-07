import { useEffect, useState } from 'react';
import { MovieInfo, PageType } from '../../lib/types';
import { useTabID } from '../providers/CurrentTabProvider';

export function useMovieInfo(pageType: PageType) {
  const tabID = useTabID();
  const [movieInfo, setMovieInfo] = useState<MovieInfo | null>(null);

  useEffect(() => {
    if (!tabID || !pageType) return;

    browser.scripting
      .executeScript({
        target: { tabId: tabID },
        files: ['/src/js/browser-polyfill.min.js'],
      })
      .then((_) => {
        browser.scripting
          .executeScript({
            target: { tabId: tabID },
            func: getMovieInfo,
          })
          .then((response) => {
            const result = response[0].result as MovieInfo;
            setMovieInfo(result);
          });
      });
  }, [tabID, pageType]);

  return movieInfo;
}

function getMovieInfo() {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = browser.runtime.getURL(
      'src/js/InjectionScripts/extractMovieInfo.js',
    );
    document.documentElement.appendChild(script);

    const intervalId = setInterval(() => {
      if (script.dataset.result) {
        clearInterval(intervalId);
        const result = JSON.parse(script.dataset.result);
        document.documentElement.removeChild(script);
        resolve(result);
      }
    }, 30);
  });
}
