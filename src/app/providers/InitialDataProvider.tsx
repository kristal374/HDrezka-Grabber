import { createContext, use } from 'react';
import { init } from '../initialization';

const InitialDataContext = createContext<
  Required<Awaited<ReturnType<typeof init>>>
>(null!);

type Props = {
  initPromise: ReturnType<typeof init>;
} & React.PropsWithChildren;

export function InitialDataProvider({ initPromise, children }: Props) {
  const initData = use(initPromise);
  if (!initData.tabId) {
    throw new Error('Tab ID is undefined');
  }
  return (
    <InitialDataContext.Provider value={initData}>
      {children}
    </InitialDataContext.Provider>
  );
}

export function useInitData() {
  return use(InitialDataContext);
}
