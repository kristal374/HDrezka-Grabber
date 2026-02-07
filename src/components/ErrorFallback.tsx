import { FallbackProps } from 'react-error-boundary';

export function ErrorFallback({ error }: FallbackProps) {
  // Call resetErrorBoundary() to reset the error boundary and retry the render.
  logger.critical(error);
  return (
    <div role='alert' className='p-3'>
      <p className='font-semibold'>Something went wrong:</p>
      <pre style={{ color: 'red' }}>{error.message}</pre>
    </div>
  );
}
