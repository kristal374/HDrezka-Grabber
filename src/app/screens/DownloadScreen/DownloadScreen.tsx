import { useEffect, useRef, useState } from 'react';
import { Menu } from '../../../components/Menu';
import { DownloadIcon } from '../../../components/Icons';
import { QualitySelector } from './QualitySelector';
import { SubtitleSelector } from './SubtitleSelector';
import { EpisodeRangeSelector } from './EpisodeRangeSelector';
import { VoiceOverSelector } from './VoiceOverSelector';
import { useMovieInfo } from '../../hooks/useMovieInfo';
import type {
  ActualEpisodeData,
  ActualVoiceOverData,
  DataForUpdate,
  Fields,
  Message,
  PageType,
  QualityRef,
  Seasons,
  SerialFields,
  SubtitleRef,
  VoiceOverInfo,
} from '../../../lib/types';
import { FilmInfo, SeasonsRef, SerialInfo } from '../../../lib/types';
import { NotificationField } from './NotificationField';

type Props = {
  pageType: PageType;
};

type CurrentEpisode = {
  seasonID: string;
  episodeID: string;
};

export function DownloadScreen({ pageType }: Props) {
  const notificationString = null;
  const [movieInfo, subtitles, siteURL] = useMovieInfo(pageType);
  const [voiceOver, setVoiceOver] = useState<VoiceOverInfo | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const [downloadSerial, setDownloadSerial] = useState(false);
  const seasonsRef = useRef<SeasonsRef | null>(null);
  const [range, setRange] = useState<Seasons | null>(null);

  const qualityRef = useRef<QualityRef | null>(null);
  const subtitleRef = useRef<SubtitleRef | null>(null);

  const [currentEpisode, setCurrentEpisode] = useState<CurrentEpisode | null>(
    null,
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
    browser.runtime
      .sendMessage<Message<DataForUpdate>>({
        type: 'updateTranslateInfo',
        message: {
          siteURL: siteURL!,
          movieData: {
            id: movieInfo!.film_id,
            translator_id: voiceOver.id,
            favs: movieInfo!.favs,
            action: 'get_episodes',
          },
        },
      })
      .then((response) => {
        const result = response as ActualVoiceOverData;
        seasonsRef.current?.setSeasonsList(result.seasons);
        subtitleRef.current?.setSubtitles(result.subtitle);
        qualityRef.current?.setStreams(result.streams);
        const seasonID = Object.keys(result.seasons)[0];
        const episodeID = result.seasons[seasonID].episodes[0].id;
        setCurrentEpisode({ seasonID, episodeID });
      });
  }, [voiceOver]);

  useEffect(() => {
    // При обновлении range-а мы должны отслеживать только самый первый эпизод
    // в списке. При обновлении данных эпизода мы должны обновить списки
    // доступного качества и субтитров.
    //
    // Первое обновление данных должно игнорироваться т.к. данные мы
    // подтягиваем со страницы фильма и они уже являются актуальными.

    if (!range) return;

    const isFirstUpdate = currentEpisode === null;

    const seasonID = isFirstUpdate
      ? (movieInfo as SerialInfo).season_id
      : Object.keys(range).sort((a, b) => Number(a) - Number(b))[0];

    const episodeID = isFirstUpdate
      ? (movieInfo as SerialInfo).episode_id
      : range[seasonID].episodes[0].id;

    const newCurrentEpisode: CurrentEpisode = { seasonID, episodeID };
    if (JSON.stringify(currentEpisode) === JSON.stringify(newCurrentEpisode))
      return;

    setCurrentEpisode(newCurrentEpisode);

    if (isFirstUpdate) return;

    browser.runtime
      .sendMessage<Message<DataForUpdate>>({
        type: 'updateEpisodesInfo',
        message: {
          siteURL: siteURL!,
          movieData: {
            id: movieInfo!.film_id,
            translator_id: voiceOver!.id,
            season: newCurrentEpisode!.seasonID,
            episode: newCurrentEpisode!.episodeID,
            favs: movieInfo!.favs,
            action: 'get_stream',
          } satisfies Fields & SerialFields,
        },
      })
      .then((response) => {
        const result = response as ActualEpisodeData;
        subtitleRef.current?.setSubtitles(result.subtitle);
        qualityRef.current?.setStreams(result.streams);
      });
  }, [range]);

  useEffect(() => {
    if (!movieInfo) return;
    qualityRef.current?.setStreams(movieInfo.streams);
    subtitleRef.current?.setSubtitles(subtitles);
  }, [movieInfo]);

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
            //     quality: qualityRef.current?.quality,
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
          seasonsRef={seasonsRef}
          defaultSeasonStart={(movieInfo as SerialInfo).season_id}
          defaultEpisodeStart={(movieInfo as SerialInfo).episode_id}
          downloadSerial={downloadSerial}
          setDownloadSerial={setDownloadSerial}
          setRange={setRange}
        />

        <SubtitleSelector subtitleRef={subtitleRef} />
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
          downloadSerial={downloadSerial}
        />
        <QualitySelector qualityRef={qualityRef} />
      </div>
    </div>
  );
}
