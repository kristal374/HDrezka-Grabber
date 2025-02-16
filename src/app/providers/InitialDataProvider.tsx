import { createContext, use, useLayoutEffect, useState } from 'react';
import { saveSessionStorage } from '../../lib/storage';
import { resetAction, store, useAppDispatch } from '../../store';
import { init } from '../initialization';

export const InitialDataContext = createContext<
  Required<Awaited<ReturnType<typeof init>>>
>(null!);

type Props = {
  initPromise: ReturnType<typeof init>;
} & React.PropsWithChildren;

export function InitialDataProvider({ initPromise, children }: Props) {
  const dispatch = useAppDispatch();
  const [initData, setInitData] = useState<
    Required<Awaited<ReturnType<typeof init>>>
  >(null!);

  useLayoutEffect(() => {
    initPromise.then((result) => {
      if (!result.tabId) throw new Error('Tab ID is undefined');
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
