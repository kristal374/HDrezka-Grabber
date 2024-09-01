import { createContext, useContext, useEffect, useState } from 'react';

type Props = {
  currentTab: { id: number | undefined; isHdrezka: boolean };
  targetTab: { tabId: number | undefined; allFrames: boolean };
};

const defaultValue: Props = {
  currentTab: { id: undefined, isHdrezka: false },
  targetTab: { tabId: undefined, allFrames: false },
};

const Context = createContext(defaultValue);

export function useCurrentTab() {
  return useContext(Context);
}

export function CurrentTabProvider({ children }: React.PropsWithChildren) {
  const [id, setId] = useState<number>();
  const [isHdrezka, setIsHdrezka] = useState(false);
  const targetTab = { tabId: id, allFrames: false };
  useEffect(() => {
    getCurrentTabId().then((id) => id && setId(id));
  }, []);
  useEffect(() => {
    if (!targetTab.tabId) return;
    browser.scripting.executeScript({
      target: targetTab,
      files: ['/src/js/browser-polyfill.min.js'],
    });
    browser.scripting
      .executeScript({
        target: targetTab,
        func: isTargetSite,
      })
      .then((result: any) => {
        setIsHdrezka(result[0].result);
      });
  }, [id]);
  return (
    <Context.Provider
      value={{
        currentTab: { id, isHdrezka },
        targetTab,
      }}
    >
      {children}
    </Context.Provider>
  );
}

async function getCurrentTabId() {
  const tabs = await browser.tabs.query({ active: true });
  if (tabs && tabs.length > 0) {
    return tabs[0].id;
  } else {
    return undefined;
  }
}

function isTargetSite() {
  return new Promise<boolean>((resolve) => {
    const nameSite = document.querySelector('meta[property="og:site_name"]');
    // @ts-expect-error
    resolve(nameSite ? nameSite.content === 'rezka.ag' : false);
  });
}
