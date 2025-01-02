import { useEffect, useState } from 'react';
import { Menu } from '../../../components/Menu';
import { DownloadIcon } from '../../../components/Icons';
import { QualitySelector } from './QualitySelector';
import { SubtitleSelector } from './SubtitleSelector';
import { EpisodeRangeSelector } from './EpisodeRangeSelector';
import { VoiceOverSelector } from './VoiceOverSelector';
import { useMovieInfo } from '../../hooks/useMovieInfo';

import type { PageType, Seasons, VoiceOverInfo } from '../../../lib/types';
import { FilmInfo, SerialInfo } from '../../../lib/types';
import { NotificationField } from './NotificationField';
import { useEpisodes } from '../../hooks/useEpisodes';

type Props = {
  pageType: PageType;
};

type CurrentEpisode = {
  seasonID: string | null;
  episodeID: string | null;
};
export function DownloadScreen({ pageType }: Props) {
  const notificationString = null;
  const [movieInfo, subtitles, siteURL] = useMovieInfo(pageType);
  const [voiceOver, setVoiceOver] = useState<VoiceOverInfo | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const defaultSeasons = useEpisodes(pageType);
  const [seasons, setSeasons] = useState<Seasons | null>(null);
  const [range, setRange] = useState<Seasons | null>(null);

  const [currentEpisode, setCurrentEpisode] = useState<CurrentEpisode>(
      {
        seasonID: null,
        episodeID: null,
      }
  );

  useEffect(() => {
    // При обновление озвучки мы должны обновить список эпизодов(если есть),
    // после, мы должны установить стартовый сезон и эпизод. В следствии чего
    // должен измениться range, где мы для первого эпизода должны получить
    // список доступных качеств и субтитров. Но при этом все данные уже придут
    // актуальными с сервера и мы не должны обновлять данные эпизода.

    if (!voiceOver) return;
    if (isFirstLoad) {
      setIsFirstLoad(false);
      return;
    }

    console.log('Update voiceOver data', voiceOver);
  }, [voiceOver]);

  useEffect(() => {
    // При обновлении range-а мы должны отслеживать только самый первый эпизод
    // в списке. При обновлении данных эпизода мы должны обновить списки
    // доступного качества и субтитров.
    //
    // Первое обновление данных должно игнорироваться т.к. данные мы
    // подтягиваем со страницы фильма и они уже являются актуальными.

    if (!range) return;

    const seasonID =
      currentEpisode.seasonID === null
        ? (movieInfo as SerialInfo).season_id
        : Object.keys(range).sort((a, b) => Number(a) - Number(b))[0];

    const episodeID =
      currentEpisode.seasonID === null
        ? (movieInfo as SerialInfo).episode_id
        : range[seasonID].episodes[0].id;

    const newCurrentEpisode: CurrentEpisode =  { seasonID, episodeID }
    if (JSON.stringify(currentEpisode) === JSON.stringify(newCurrentEpisode))
      return;

    const isFirstUpdate = currentEpisode.seasonID === null;
    setCurrentEpisode(newCurrentEpisode);

    if (isFirstUpdate) return;

    console.log('Update episodes data', newCurrentEpisode);
  }, [range]);

  useEffect(() => {
    if (!defaultSeasons) return;
    setSeasons(defaultSeasons);
  }, [defaultSeasons]);

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
          defaultVoiceOverId={movieInfo!.translator_id}
          is_camrip={(movieInfo as FilmInfo)?.is_camrip}
          is_director={(movieInfo as FilmInfo)?.is_director}
          is_ads={(movieInfo as FilmInfo)?.is_ads}
          voiceOver={voiceOver}
          setVoiceOver={setVoiceOver}
        />
        <QualitySelector streams={movieInfo!.streams} />
      </div>
    </div>
  );
}