import { useChangeRangeEpisodes } from '@/app/hooks/popup/useChangeRangeEpisodes';
import { useChangeVoiceOver } from '@/app/hooks/popup/useChangeVoiceOver';
import { useInitData } from '@/app/hooks/popup/useInitData';
import { Menu } from '@/components/Menu';
import { PopupInitialDataContext } from '@/html/popup';
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

  const movieInfo = useAppSelector(selectMovieInfo);
  const notifications = useAppSelector(selectNotifications);
  const subtitleLang = useAppSelector(selectCurrentSubtitle);

  useInitData();
  useChangeVoiceOver();
  useChangeRangeEpisodes();

  if (movieInfo === null || !movieInfo.success) {
    logger.info('"MovieInfo" is missing.');
    // TODO: Теоретически окно может показываться вечно если мы не получим movieInfo
    return <DownloadScreenSkeleton />;
  }

  const showSeparatorLine =
    pageType === 'SERIAL' || !!subtitleLang || notifications.length > 0;

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

        <EpisodeRangeSelector />

        <SubtitleSelector />
        {showSeparatorLine && (
          <hr className='border-popup-border w-full border-b' />
        )}

        <VoiceOverSelector />
        <QualitySelector />
      </div>
    </div>
  );
}
