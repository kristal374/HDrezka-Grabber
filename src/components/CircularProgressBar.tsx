import { Progress } from '../lib/types';
import { LoadAnimation } from './Icons';

export function CircularProgressBar({ progress }: { progress: Progress }) {
  if (
    progress.completed === null ||
    progress.total === null ||
    progress.current === null
  ) {
    return <LoadAnimation size={96} fill='white' />;
  }

  return (
    <>
      {progress.total > 1 ? (
        <div className='flex flex-col items-center'>
          <p className='text-center text-base'>{progress.current}%</p>
          <p className='text-center text-base'>
            {progress.completed}/{progress.total}
          </p>
        </div>
      ) : (
        <div className='flex flex-col items-center'>
          <p className='text-center text-3xl'>{progress.current}%</p>
          COMPLETE
        </div>
      )}
    </>
  );
}
