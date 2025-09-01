import browser from 'webextension-polyfill';

import { useCallback } from 'react';
import { CircularProgressBar } from '../../../components/CircularProgressBar';
import { AnimatedCheckIcon, DownloadIcon } from '../../../components/Icons';
import { Initiator, Message } from '../../../lib/types';
import { cn } from '../../../lib/utils';
import { useAppSelector } from '../../../store';
import { useTrackingTotalProgressForMovie } from '../../hooks/useTrackingTotalProgressForMovie';
import { selectMovieInfo } from './DownloadScreen.slice';
import { selectRange } from './EpisodeRangeSelector.slice';
import { selectCurrentQuality } from './QualitySelector.slice';
import {
  selectCurrentSubtitle,
  selectDownloadSubtitle,
} from './SubtitleSelector.slice';
import { selectCurrentVoiceOver } from './VoiceOverSelector.slice';

export function LoadButton() {
  const movieInfo = useAppSelector(selectMovieInfo)!;
  const range = useAppSelector(selectRange);
  const voiceOver = useAppSelector(selectCurrentVoiceOver)!;
  const subtitleLang = useAppSelector(selectCurrentSubtitle);
  const downloadSubtitle = useAppSelector((state) =>
    selectDownloadSubtitle(state),
  );

  const quality = useAppSelector(selectCurrentQuality)!;

  const progress = useTrackingTotalProgressForMovie(
    parseInt(movieInfo.data.id),
  );

  const handleClick = useCallback(() => {
    browser.runtime.sendMessage<Message<Initiator>>({
      type: 'trigger',
      message: {
        movieId: movieInfo.data.id,
        site_url: movieInfo.url,
        film_name: {
          localized: movieInfo.filename.local,
          original: movieInfo.filename.origin,
        },
        range: range,
        voice_over: voiceOver,
        quality: quality,
        subtitle: downloadSubtitle
          ? {
              lang: subtitleLang!.lang,
              code: subtitleLang!.code,
            }
          : null,
        favs: movieInfo.data.favs,
        timestamp: String(new Date().getTime()),
      },
    });
  }, [movieInfo, range, voiceOver, subtitleLang, downloadSubtitle, quality]);

  const isCompleted =
    !!progress && progress.completedLoads === progress.totalLoads;
  return (
    <button
      className={cn(
        'group relative flex size-[120px] items-center justify-center overflow-clip rounded-full',
        'bg-popup-border hover:bg-input cursor-pointer text-white',
        isCompleted && 'cursor-not-allowed',
      )}
      onClick={handleClick}
      disabled={isCompleted}
    >
      {!progress && <DownloadIcon />}
      {progress &&
        (isCompleted ? (
          <AnimatedCheckIcon className='size-16' />
        ) : (
          <CircularProgressBar progress={progress} />
        ))}
    </button>
  );
}
