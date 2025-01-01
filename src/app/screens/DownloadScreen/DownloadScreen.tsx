import { useEffect, useState } from 'react';
import { Menu } from '../../../components/Menu';
import { DownloadIcon } from '../../../components/Icons';
import { QualitySelector } from './QualitySelector';
import { SubtitleSelector } from './SubtitleSelector';
import { EpisodeRangeSelector } from './EpisodeRangeSelector';
import { VoiceOverSelector } from './VoiceOverSelector';
import { useMovieInfo } from '../../hooks/useMovieInfo';
import { sliceSeasons } from '../../../lib/utils';
import type {
  PageType,
  Message,
  Initiator,
  Seasons,
  VoiceOverInfo,
} from '../../../lib/types';
import { FilmInfo, SerialInfo } from '../../../lib/types';
import { NotificationField } from './NotificationField';
import { useEpisodes } from '../../hooks/useEpisodes';

type Props = {
  pageType: PageType;
};

export function DownloadScreen({ pageType }: Props) {
  const notificationString = null;
  const [movieInfo, subtitles, siteURL] = useMovieInfo(pageType);
  const [voiceOver, setVoiceOver] = useState<VoiceOverInfo | null>(null);
  const defaultSeasons = useEpisodes(pageType);
  const [seasons, setSeasons] = useState<Seasons | null>(null);
  const [range, setRange] = useState<Seasons | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  useEffect(() => {
    if (isFirstLoad) {
      setIsFirstLoad(false);
      return;
    }
    if (!voiceOver) return;
    console.log(voiceOver);
    // callBackground('updateMovieInfo', voiceOver).then(() => {
    //  setSeasons(null);
    // });
  }, [voiceOver]);

  if (!movieInfo) return null;

  return (
    <div className='flex size-full flex-col gap-5'>
      <div className='relative flex items-center justify-center'>
        <button
          className='flex size-[120px] cursor-pointer items-center justify-center rounded-full bg-popup-border text-white hover:bg-input'
          onClick={() => {
            console.log('download');
            // browser.runtime.sendMessage<Message<Initiator>>({
            //   type: 'trigger',
            //   message: {
            //     query_data:
            //       pageType === 'FILM'
            //         ? {
            //             id: movieInfo!.film_id,
            //             translator_id: voiceOverId,
            //             is_camrip: (movieInfo as FilmInfo).is_camrip,
            //             is_ads: (movieInfo as FilmInfo).is_ads,
            //             is_director: (movieInfo as FilmInfo).is_director,
            //             favs: movieInfo!.favs,
            //             action: 'get_movie',
            //           }
            //         : {
            //             id: movieInfo!.film_id,
            //             translator_id: voiceOverId,
            //             season: '1',
            //             episode: '1',
            //             favs: movieInfo!.favs,
            //             action: 'get_stream',
            //           },
            //     site_url: siteURL!,
            //     range: range,
            //     local_film_name: movieInfo!.local_film_name,
            //     original_film_name: movieInfo!.original_film_name,
            //     voice_over: voiceOvers!.find((v) => v.id === voiceOverId)
            //       ?.title!,
            //     quality: quality,
            //     subtitle: subtitleLang,
            //     timestamp: new Date(),
            //   },
            // });
          }}
        >
          <DownloadIcon />
        </button>
        <Menu />
      </div>
      <div className='flex w-full flex-col gap-3'>
        <NotificationField notificationString={notificationString} />

        <EpisodeRangeSelector
          seasons={seasons}
          defaultSeasonStart={(movieInfo as SerialInfo).season_id}
          defaultEpisodeStart={(movieInfo as SerialInfo).episode_id}
          setRange={setRange}
        />

        <SubtitleSelector subtitles={subtitles} />
        {/*TODO: скрывать разделитель после закрытия ошибки если нет других элементов*/}
        {/*Добавляем разделитель если это сериал или есть субтитры или ошибка*/}
        {(pageType === 'SERIAL' ||
          subtitles?.subtitle ||
          notificationString) && (
          <hr className='w-full border-b border-popup-border' />
        )}

        <VoiceOverSelector
          pageType={pageType}
          defaultVoiceOverId={movieInfo.translator_id}
          is_camrip={(movieInfo as FilmInfo)?.is_camrip}
          is_director={(movieInfo as FilmInfo)?.is_director}
          is_ads={(movieInfo as FilmInfo)?.is_ads}
          voiceOver={voiceOver}
          setVoiceOver={setVoiceOver}
        />
        <QualitySelector streams={movieInfo.streams} />
      </div>
    </div>
  );
}
