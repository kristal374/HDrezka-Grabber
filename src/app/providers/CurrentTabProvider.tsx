import { createContext, useContext, useEffect, useState } from 'react';
import { Logger } from '../../lib/logger';

const logger = await Logger.create('/src/js/popup.js.map');

const TabIDContext = createContext<number | undefined>(undefined);

export function useTabID() {
  return useContext(TabIDContext);
}

export function CurrentTabProvider({ children }: React.PropsWithChildren) {
  const [id, setId] = useState<number>();

  useEffect(() => {
    getCurrentTabId().then((tabID) => {
      if (!tabID) return;
      setId(tabID);
    });
  }, []);

  return <TabIDContext.Provider value={id}>{children}</TabIDContext.Provider>;
}

async function getCurrentTabId() {
  const tabs = await browser.tabs.query({ active: true });
  if (tabs && tabs.length > 0) {
    return tabs[0].id;
  } else {
    return undefined;
  }
}
