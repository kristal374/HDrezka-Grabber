import { MovieProgress } from '../lib/types';
import { LoadAnimation } from './Icons';

export function CircularProgressBar({ progress }: { progress: MovieProgress }) {
  if (!progress) {
    return <LoadAnimation size={96} fill='white' />;
  }

  return (
    <>
      {progress.totalLoads > 1 ? (
        <div className='flex flex-col items-center'>
          <p className='text-center text-base'>
            {progress.videoProgressInPercents ?? 0}%
          </p>
          <p className='text-center text-base'>
            {progress.completedLoads}/{progress.totalLoads}
          </p>
        </div>
      ) : (
        <div className='flex flex-col items-center'>
          <p className='text-center text-3xl'>
            {progress.videoProgressInPercents ?? 0}%
          </p>
          COMPLETE
        </div>
      )}
    </>
  );
}
