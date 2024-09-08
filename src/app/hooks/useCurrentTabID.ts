import { useEffect, useState } from 'react';

export function useCurrentTabID() {
  const [id, setId] = useState<number>();

  useEffect(() => {
    getCurrentTabId().then((tabID) => {
      if (!tabID) return;
      setId(tabID);
    });
  }, []);
  return id;
}

async function getCurrentTabId() {
  const tabs = await browser.tabs.query({ active: true });
  if (tabs && tabs.length > 0) {
    return tabs[0].id;
  } else {
    return undefined;
  }
}
