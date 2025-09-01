import NumberFlow from '@number-flow/react';
import { XIcon } from 'lucide-react';
import { useState } from 'react';
import { MovieProgress } from '../lib/types';
import { cn } from '../lib/utils';

const RADIUS = 40;
const STROKE = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = { progress: NonNullable<MovieProgress> };

export function CircularProgressBar({ progress }: Props) {
  const [allowToCancel, setAllowToCancel] = useState<boolean>(() =>
    progress
      ? !!progress.videoProgressInPercents || progress.completedLoads > 1
      : false,
  );
  const isWaiting = !progress.videoProgressInPercents;
  const percent = Math.min(
    Math.max(progress.videoProgressInPercents ?? 0, 0),
    100,
  );
  const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
  return (
    <>
      <svg
        width={96}
        height={96}
        viewBox='0 0 96 96'
        className={cn('size-full -rotate-90', isWaiting && 'animate-spin')}
        onPointerLeave={() => setAllowToCancel(true)}
      >
        <circle cx={48} cy={48} r={RADIUS} strokeWidth={STROKE} fill='none' />
        <circle
          cx={48}
          cy={48}
          r={RADIUS}
          strokeWidth={STROKE}
          fill='none'
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={isWaiting ? CIRCUMFERENCE / 3 : offset}
          strokeLinecap='round'
          style={{
            transition: 'stroke-dashoffset 0.5s',
            stroke: 'var(--link-color)',
          }}
        />
      </svg>
      <span className='pointer-events-none absolute w-full text-center text-xl'>
        {progress.totalLoads > 1 ? (
          <>
            <NumberFlow value={progress.completedLoads} />/{progress.totalLoads}
          </>
        ) : (
          `${percent}%`
        )}
      </span>
      {allowToCancel && (
        <div
          className={cn(
            'opacity-0 transition-opacity duration-300 group-hover:opacity-100',
            'bg-input absolute flex size-full items-center justify-center',
          )}
          title={browser.i18n.getMessage('popup_DownloadCancel')}
        >
          <XIcon className='size-16 transition-transform hover:scale-110' />
        </div>
      )}
    </>
  );
}
