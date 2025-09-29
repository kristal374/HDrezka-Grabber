import React, { ReactNode, useEffect, useState } from 'react';

type AsyncContextProviderProps<T> = {
  asyncInitFunction: Promise<T>;
  Context: React.Context<T>;
  children: ReactNode;
};

export function AsyncContextProvider<T>({
  asyncInitFunction,
  Context,
  children,
}: AsyncContextProviderProps<T>) {
  const [initData, setInitData] = useState<T | undefined>(undefined);

  useEffect(() => {
    asyncInitFunction.then(setInitData);
  }, []);

  if (typeof initData === 'undefined') return null;

  return <Context value={initData}>{children}</Context>;
}
