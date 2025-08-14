import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from '../components/ErrorFallback';
import { Layout } from '../components/Layout';
import { init } from './initialization';
import { InitialDataProvider } from './providers/InitialDataProvider';

export function App({ children }: React.PropsWithChildren) {
  return (
    <Layout>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <InitialDataProvider initPromise={init()}>
          {children}
        </InitialDataProvider>
      </ErrorBoundary>
    </Layout>
  );
}
