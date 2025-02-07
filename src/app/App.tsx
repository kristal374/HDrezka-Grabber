import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Layout } from '../components/Layout';
import { ErrorFallback } from '../components/ErrorFallback';
import { init } from './initialization';
import { InitialDataProvider } from './providers/InitialDataProvider';
import { ProcessingScreen } from './screens/ProcessingScreen';

export function App({ children }: React.PropsWithChildren) {
  return (
    <Layout>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<ProcessingScreen />}>
          <InitialDataProvider initPromise={init()}>
            {children}
          </InitialDataProvider>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
