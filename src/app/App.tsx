import { ErrorFallback } from '@/components/ErrorFallback';
import { ErrorBoundary } from 'react-error-boundary';
import { AsyncContextProvider } from './providers/AsyncContextProvider';

type AppProps<T> = {
  asyncInitFunction: (
    setInitData: React.Dispatch<React.SetStateAction<T | undefined>>,
  ) => Promise<T>;
  Context: React.Context<T>;
  children: React.ReactNode;
};

export function App<T>({ asyncInitFunction, Context, children }: AppProps<T>) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AsyncContextProvider
        asyncInitFunction={asyncInitFunction}
        Context={Context}
      >
        {children}
      </AsyncContextProvider>
    </ErrorBoundary>
  );
}
