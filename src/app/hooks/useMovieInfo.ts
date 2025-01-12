import { useEffect, useState } from 'react';
import { MovieInfo, PageType } from '../../lib/types';
import { useTabID } from '../providers/CurrentTabProvider';

export function useMovieInfo(pageType: PageType) {
  const tabID = useTabID();
  const [movieInfo, setMovieInfo] = useState<MovieInfo | null>(null);

  useEffect(() => {
    if (!tabID || !pageType) return;

    const pathToInjectScript = browser.runtime.getURL(
      'src/js/InjectionScripts/extractMovieInfo.js',
    );
    browser.scripting
      .executeScript({
        target: { tabId: tabID },
        func: getMovieInfo,
        args: [pathToInjectScript],
      })
      .then((response) => {
        const result = response[0].result as MovieInfo;
        setMovieInfo(result);
      });
  }, [tabID, pageType]);

  return movieInfo;
}

function getMovieInfo(pathToInjectScript: string) {
  return new Promise((resolve) => {
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
    }, 30);
  });
}
