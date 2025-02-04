import { useEffect } from 'react';
import { MovieInfo } from '../../lib/types';
import { useInitData } from '../providers/InitialDataProvider';
import { useStorage } from './useStorage';

export function useMovieInfo() {
  const { tabId } = useInitData();
  const [movieInfo, setMovieInfo] = useStorage<MovieInfo | null>(
    'movieInfo',
    null,
  );

  useEffect(() => {
    const pathToInjectScript = browser.runtime.getURL(
      'src/js/InjectionScripts/extractMovieInfo.js',
    );
    browser.scripting
      .executeScript({
        target: { tabId },
        func: getMovieInfo,
        args: [pathToInjectScript],
      })
      .then((response) => {
        const result = response[0].result as MovieInfo;
        setMovieInfo(result);
      });
  }, []);

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
