import { createContext, use, useLayoutEffect, useState } from 'react';
import { OutsideLink } from '../../components/OutsideLink';
import { saveSessionStorage } from '../../lib/storage';
import { resetAction, store, useAppDispatch } from '../../store';
import { init, type InitData } from '../initialization';
import { DefaultScreen } from '../screens/DefaultScreen';

export const InitialDataContext = createContext<InitData>(null!);

interface InitialDataProviderProps extends React.PropsWithChildren {
  initPromise: ReturnType<typeof init>;
}

export function InitialDataProvider({
  initPromise,
  children,
}: InitialDataProviderProps) {
  const dispatch = useAppDispatch();
  const [initData, setInitData] = useState<InitData | null>(null);
  const [hasTabId, setHasTabId] = useState(true);

  useLayoutEffect(() => {
    initPromise.then((result) => {
      if (!result.tabId) {
        setHasTabId(false);
        return;
      }

      setInitData(result);
      if (
        Object.keys(result.sessionStorage).length > 0 &&
        result.sessionStorage?.mainComponentReducer?.movieInfo?.url ===
          result.siteUrl
      ) {
        dispatch(resetAction({ data: result.sessionStorage }));
      }

      store.subscribe(() => {
        saveSessionStorage(result.tabId, store.getState());
      });
    });
  }, []);

  if (!hasTabId)
    return (
      <DefaultScreen vpnNotice={false}>
        {browser.i18n.getMessage('popup_stub_default')}{' '}
        <OutsideLink url={'https://hdrezka.ag'} text={'HDrezka.ag'} />!
      </DefaultScreen>
    );

  if (!initData) return null;

  return (
    <InitialDataContext.Provider value={initData}>
      {children}
    </InitialDataContext.Provider>
  );
}

export function useInitData() {
  return use(InitialDataContext);
}
