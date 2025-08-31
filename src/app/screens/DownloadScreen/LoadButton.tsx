import browser from 'webextension-polyfill';

import { useCallback, useState } from 'react';
import { CircularProgressBar } from '../../../components/CircularProgressBar';
import { DownloadIcon } from '../../../components/Icons';
import { ButtonState, Initiator, Message } from '../../../lib/types';
import { useAppDispatch, useAppSelector } from '../../../store';
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
  const dispatch = useAppDispatch();
  const [buttonState, setButtonState] = useState<ButtonState>('DEFAULT');

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
    setButtonState((prevState) => {
      switch (prevState) {
        case 'LOADING':
          return 'CANCELLED';
        case 'PROCESSING':
          return 'CANCELLED';
        case 'DEFAULT':
          return 'PROCESSING';
        default:
          return 'DEFAULT';
        // throw new Error('Unexpected state');
      }
    });

    browser.runtime
      .sendMessage<Message<Initiator>>({
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
      })
      .then(() => {
        setButtonState((prevState) =>
          prevState === 'PROCESSING' ? 'LOADING' : 'DEFAULT',
        );
      });
  }, [movieInfo, range, voiceOver, subtitleLang, downloadSubtitle, quality]);

  // if (buttonState === 'LOADING' && progress.completed === progress.total) {
  //   setButtonState('COMPLETED');
  // }

  // logger.info('New render LoadButton component.');
  return (
    <button
      className='bg-popup-border hover:bg-input relative flex size-[120px] cursor-pointer items-center justify-center rounded-full text-white'
      onClick={handleClick}
    >
      {/*<DownloadIcon />*/}
      {/*{buttonState === 'DEFAULT' && <DownloadIcon />}*/}
      {/*{buttonState === 'PROCESSING' && <LoadAnimation size={96} fill='white' />}*/}
      {!progress && <DownloadIcon />}
      {progress && progress.totalLoads !== progress.completedLoads && (
        <CircularProgressBar progress={progress} />
      )}
      {/*{buttonState === 'COMPLETED' && 'OK!'}*/}
      {/*{buttonState === 'CANCELLED' && 'CANCELLED'}*/}
    </button>
  );
}

// TODO:
// Сделать повторное открытие попапа быстрее.
// Добавить управление состояниями попапа.
