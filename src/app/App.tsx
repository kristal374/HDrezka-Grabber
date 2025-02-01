import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { LoadAnimation } from '../components/Icons';
import { Layout } from '../components/Layout';
import { ErrorFallback } from './ErrorFallback';
import { init } from './initialization';
import { InitialDataProvider } from './providers/InitialDataProvider';
import { Router } from './Router';
import { DefaultScreen } from './screens/DefaultScreen';

export function App({ children }: React.PropsWithChildren) {
  return (
    <Layout>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense
          fallback={
            <DefaultScreen className='py-12'>
              <LoadAnimation size={128} fill={'white'}></LoadAnimation>
            </DefaultScreen>
          }
        >
          <InitialDataProvider initPromise={init()}>
            <Router />
          </InitialDataProvider>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
