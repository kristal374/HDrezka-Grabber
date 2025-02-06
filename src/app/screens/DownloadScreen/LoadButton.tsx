import { useState } from 'react';
import browser from 'webextension-polyfill';
import { DownloadIcon, LoadAnimation } from '../../../components/Icons';
import { ButtonState, Initiator, Message } from '../../../lib/types';
import { useAppSelector } from '../../../store';
import { selectMovieInfo } from './DownloadScreen.slice';
import { selectRange } from './EpisodeRangeSelector.slice';
import { selectCurrentQuality } from './QualitySelector.slice';
import { selectCurrentSubtitle } from './SubtitleSelector.slice';
import { selectCurrentVoiceOver } from './VoiceOverSelector.slice';

export function LoadButton() {
  const [buttonState, setButtonState] = useState<ButtonState>('DEFAULT');

  const movieInfo = useAppSelector((state) => selectMovieInfo(state));
  const range = useAppSelector((state) => selectRange(state));
  const voiceOver = useAppSelector((state) => selectCurrentVoiceOver(state));
  const subtitleLang = useAppSelector((state) => selectCurrentSubtitle(state));
  const quality = useAppSelector((state) => selectCurrentQuality(state));

  if (movieInfo === null) return null;

  logger.info('New render LoadButton component.');
  return (
    <button
      className='flex size-[120px] cursor-pointer items-center justify-center rounded-full bg-popup-border text-white hover:bg-input'
      onClick={() => {
        setButtonState(buttonState === 'LOADING' ? 'DEFAULT' : 'PROCESSING');
        browser.runtime
          .sendMessage<Message<Initiator>>({
            type: 'trigger',
            message: {
              query_data: movieInfo.data,
              site_url: movieInfo.url,
              range: range,
              film_name: {
                localized: movieInfo.filename.local,
                original: movieInfo.filename.origin,
              },
              voice_over: voiceOver!,
              quality: quality!,
              subtitle: subtitleLang?.lang!,
              timestamp: new Date(),
            },
          })
          .then(() => {
            setButtonState(
              buttonState === 'PROCESSING' ? 'LOADING' : 'DEFAULT',
            );
          });
      }}
    >
      {(buttonState === 'DEFAULT' && <DownloadIcon />) ||
        (buttonState === 'PROCESSING' && (
          <LoadAnimation size={96} fill={'white'}></LoadAnimation>
        )) ||
        (buttonState === 'LOADING' && 'Loading...')}
    </button>
  );
}
