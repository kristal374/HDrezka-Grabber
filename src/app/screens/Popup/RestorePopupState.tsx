import { PopupInitialDataContext } from '@/html/popup';
import { saveSessionStorage } from '@/lib/storage';
import { useContext, useLayoutEffect, useState } from 'react';
import {
  resetAction,
  store,
  useAppDispatch,
} from './DownloadScreen/store/store';

type RestorePopupStateProps = {
  children: React.ReactNode;
};

export function RestorePopupState({ children }: RestorePopupStateProps) {
  const dispatch = useAppDispatch();
  const initData = useContext(PopupInitialDataContext)!;

  const [isReady, setIsReady] = useState<boolean>(false);

  useLayoutEffect(() => {
    if (initData.siteUrl) {
      const { sessionStorage, siteUrl, tabId } = initData;
      const storedUrl = sessionStorage?.mainComponentReducer?.movieInfo?.url;

      if (Object.keys(sessionStorage).length && storedUrl === siteUrl) {
        dispatch(resetAction({ data: sessionStorage }));
      }
      store.subscribe(() => saveSessionStorage(tabId, store.getState()));
    }

    setIsReady(true);
    logger.info('Restored popup state.');
  }, [initData]);

  // Мы должны дождаться пока завершится попытка восстановления состояния попапа,
  // иначе поведение будет непредсказуемым.
  // TODO: Теоретически если произойдёт сбой инициализации пользователь будет видеть пустой попап
  if (!isReady) return null;

  document.documentElement.className = settings.darkMode ? 'dark' : 'light';
  return children;
}
