import { createContext, useContext, useEffect, useState } from 'react';

const TabIDContext = createContext<number | undefined>(undefined);

export function useTabID() {
  return useContext(TabIDContext);
}

export function CurrentTabProvider({ children }: React.PropsWithChildren) {
  const [id, setId] = useState<number>();

  useEffect(() => {
    getCurrentTabId().then((tabID) => {
      logger.info('Attempt set new tabID.');
      if (!tabID) return;
      logger.debug(`Current tab id: ${tabID}`);
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
