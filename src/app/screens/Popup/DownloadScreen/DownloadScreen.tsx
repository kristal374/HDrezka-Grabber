import { useChangeMovieInfo } from '@/app/hooks/popup/useChangeMovieInfo';
import { useChangeRangeEpisodes } from '@/app/hooks/popup/useChangeRangeEpisodes';
import { useChangeVoiceOver } from '@/app/hooks/popup/useChangeVoiceOver';
import { Menu } from '@/components/Menu';
import { PopupInitialDataContext } from '@/html/popup';
import type { FilmData, SerialData } from '@/lib/types';
import { useContext } from 'react';
import { DownloadScreenSkeleton } from './DownloadScreenSkeleton';
import { EpisodeRangeSelector } from './EpisodeRangeSelector';
import { LoadButton } from './LoadButton';
import { NotificationField } from './NotificationField';
import { QualitySelector } from './QualitySelector';
import { selectMovieInfo } from './store/DownloadScreen.slice';
import { selectNotifications } from './store/NotificationField.slice';
import { useAppSelector } from './store/store';
import { selectCurrentSubtitle } from './store/SubtitleSelector.slice';
import { SubtitleSelector } from './SubtitleSelector';
import { VoiceOverSelector } from './VoiceOverSelector';

export function DownloadScreen() {
  const { pageType } = useContext(PopupInitialDataContext)!;

  const movieInfo = useAppSelector((state) => selectMovieInfo(state));
  const notifications = useAppSelector((state) => selectNotifications(state));
  const subtitleLang = useAppSelector((state) => selectCurrentSubtitle(state));

  useChangeVoiceOver();
  useChangeRangeEpisodes();
  useChangeMovieInfo();

  if (movieInfo === null || !movieInfo.success) {
    logger.info('"MovieInfo" is missing.');
    return <DownloadScreenSkeleton />;
  }

  const showSeparatorLine =
    pageType === 'SERIAL' || subtitleLang || notifications.length > 0;

  logger.info('New render DownloadScreen component.');
  return (
    <div className='flex size-full flex-col gap-5'>
      <div className='relative flex items-center justify-center'>
        <LoadButton />
        <Menu />
      </div>
      <div className='flex w-full flex-col gap-3'>
        <NotificationField
          isLimitedMaxHeight={pageType === 'SERIAL' && !!subtitleLang}
        />

        <EpisodeRangeSelector
          defaultSeasonStart={(movieInfo?.data as SerialData).season}
          defaultEpisodeStart={(movieInfo?.data as SerialData).episode}
        />

        <SubtitleSelector />
        {showSeparatorLine && (
          <hr className='border-popup-border w-full border-b' />
        )}

        <VoiceOverSelector
          defaultVoiceOverId={movieInfo!.data.translator_id}
          is_camrip={(movieInfo?.data as FilmData)?.is_camrip}
          is_director={(movieInfo?.data as FilmData)?.is_director}
          is_ads={(movieInfo?.data as FilmData)?.is_ads}
        />
        <QualitySelector />
      </div>
    </div>
  );
}
