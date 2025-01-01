import { useEffect, useState } from 'react';
import { Menu } from '../../../components/Menu';
import { DownloadIcon } from '../../../components/Icons';
import { QualitySelector } from './QualitySelector';
import { SubtitleSelector } from './SubtitleSelector';
import { EpisodeRangeSelector } from './EpisodeRangeSelector';
import { VoiceOverSelector } from './VoiceOverSelector';
import { useMovieInfo } from '../../hooks/useMovieInfo';
import { sliceSeasons } from '../../../lib/utils';
import type { PageType, Message, Initiator } from '../../../lib/types';
import { FilmInfo, SerialInfo } from '../../../lib/types';
import { NotificationField } from './NotificationField';

type Props = {
  pageType: PageType;
};

export function DownloadScreen({ pageType }: Props) {
  const [movieInfo, subtitles, siteURL] = useMovieInfo(pageType);
  const notificationString = "Возникла ошибка!";
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
            //     range: seasons
            //       ? downloadSerial || !('season_id' in movieInfo)
            //         ? sliceSeasons(
            //             seasons,
            //             seasonFrom,
            //             episodeFrom,
            //             seasonTo,
            //             episodeTo,
            //           )
            //         : sliceSeasons(
            //             seasons,
            //             movieInfo.season_id,
            //             movieInfo.episode_id,
            //             movieInfo.season_id,
            //             movieInfo.episode_id,
            //           )
            //       : null,
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
          pageType={pageType}
          defaultSeasonStart={(movieInfo as SerialInfo).season_id}
          defaultEpisodeStart={(movieInfo as SerialInfo).episode_id}
        />

        <SubtitleSelector subtitles={subtitles} />
        {/*TODO: скрывать разделитель после закрытия ошибки если нет других элементов*/}
        {/*Добавляем разделитель если это сериал или есть субтитры или ошибка*/}
        {(pageType === 'SERIAL' || subtitles?.subtitle || notificationString) && (
          <hr className='w-full border-b border-popup-border' />
        )}

        <VoiceOverSelector
          pageType={pageType}
          defaultVoiceOverId={movieInfo.translator_id}
          is_camrip={(movieInfo as FilmInfo)?.is_camrip}
          is_director={(movieInfo as FilmInfo)?.is_director}
          is_ads={(movieInfo as FilmInfo)?.is_ads}
        />
        <QualitySelector movieInfo={movieInfo} />
      </div>
    </div>
  );
}
