import { useContext, useLayoutEffect, useState } from 'react';
import { InitialDataContext } from '../html/popup';
import { saveSessionStorage } from '../lib/storage';
import { resetAction, store, useAppDispatch } from '../store';

type RestorePopupStateProps = {
  children: React.ReactNode;
};

export function RestorePopupState({ children }: RestorePopupStateProps) {
  const dispatch = useAppDispatch();
  const initData = useContext(InitialDataContext);

  const [isReady, setIsReady] = useState<boolean>(false);

  useLayoutEffect(() => {
    if (initData) {
      const { sessionStorage, siteUrl, tabId } = initData;
      const storedUrl = sessionStorage?.mainComponentReducer?.movieInfo?.url;

      if (Object.keys(sessionStorage).length && storedUrl === siteUrl) {
        dispatch(resetAction({ data: sessionStorage }));
      }
      store.subscribe(() => saveSessionStorage(tabId, store.getState()));
    }

    setIsReady(true);
  }, [initData]);

  // Мы должны дождаться пока завершится попытка восстановления состояния попапа,
  // иначе поведение будет непредсказуемым.
  if (!isReady) return null;
  return children;
}
