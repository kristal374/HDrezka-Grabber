import { createContext, use } from 'react';
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
  const initData = use(initPromise);
  // TODO: добавить обработку ошибки
  if (!initData.tabId) throw new Error('Tab ID is undefined');

  if (
    Object.keys(initData.sessionStorage).length > 0 &&
    initData.sessionStorage?.mainComponentReducer?.movieInfo?.url ===
      initData.siteUrl
  )
    dispatch(resetAction({ data: initData.sessionStorage }));

  store.subscribe(() => {
    saveSessionStorage(initData.tabId, store.getState());
  });

  return (
    <InitialDataContext.Provider value={initData}>
      {children}
    </InitialDataContext.Provider>
  );
}

export function useInitData() {
  return use(InitialDataContext);
}
