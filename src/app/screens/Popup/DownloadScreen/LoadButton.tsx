import browser from 'webextension-polyfill';

import { useTrackingTotalProgressForMovie } from '@/app/hooks/popup/useTrackingTotalProgressForMovie';
import { CircularProgressBar } from '@/components/CircularProgressBar';
import { AnimatedCheckIcon } from '@/components/icons/AnimatedCheckIcon';
import { DownloadIcon } from '@/components/icons/DownloadIcon';
import { ContentType, Initiator, Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useCallback } from 'react';
import { selectMovieInfo } from './store/DownloadScreen.slice';
import { selectRange } from './store/EpisodeRangeSelector.slice';
import { selectCurrentQuality } from './store/QualitySelector.slice';
import { useAppSelector } from './store/store';
import {
  selectCurrentSubtitle,
  selectDownloadOnlySubtitle,
  selectDownloadSubtitle,
} from './store/SubtitleSelector.slice';
import { selectCurrentVoiceOver } from './store/VoiceOverSelector.slice';

export function LoadButton() {
  const movieInfo = useAppSelector(selectMovieInfo)!;
  const range = useAppSelector(selectRange);
  const voiceOver = useAppSelector(selectCurrentVoiceOver)!;
  const subtitleLang = useAppSelector(selectCurrentSubtitle);
  const downloadSubtitle = useAppSelector(selectDownloadSubtitle);
  const downloadOnlySubtitle = useAppSelector(selectDownloadOnlySubtitle);

  const quality = useAppSelector(selectCurrentQuality)!;

  const progress = useTrackingTotalProgressForMovie(
    parseInt(movieInfo.data.id),
  );

  const handleClick = useCallback(() => {
    const initiator: Initiator = {
      movieId: movieInfo.data.id,
      site_url: movieInfo.url,
      site_type: 'hdrezka',
      content_type: downloadSubtitle
        ? downloadOnlySubtitle
          ? ContentType.subtitle
          : ContentType.both
        : ContentType.video,
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
    };

    browser.runtime.sendMessage<Message<Initiator>>({
      type: 'trigger',
      message: initiator,
    });
  }, [
    movieInfo,
    range,
    voiceOver,
    subtitleLang,
    downloadSubtitle,
    quality,
    downloadOnlySubtitle,
  ]);

  const isCompleted =
    !!progress && progress.completedLoads === progress.totalLoads;
  const title = !isCompleted
    ? browser.i18n.getMessage('popup_DownloadStart')
    : undefined;
  return (
    <button
      className={cn(
        'group focus-ring relative flex size-30 cursor-pointer items-center justify-center overflow-clip rounded-full text-white',
        'bg-popup-border not-disabled:hover:bg-input transition-transform duration-200 not-disabled:active:scale-96',
        'focus-visible:ring-3 focus-visible:ring-offset-3',
        isCompleted && 'cursor-not-allowed',
      )}
      type='button'
      title={title}
      aria-label={title}
      onClick={handleClick}
      disabled={isCompleted}
    >
      {!progress && <DownloadIcon className='size-19' />}
      {progress &&
        (isCompleted ? (
          <AnimatedCheckIcon className='size-16' />
        ) : (
          <CircularProgressBar progress={progress} />
        ))}
    </button>
  );
}
