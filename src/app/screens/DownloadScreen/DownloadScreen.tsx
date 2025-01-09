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
  FilmData,
  Initiator,
  Message,
  PageType,
  QualityRef,
  Seasons,
  SerialData,
  SerialFields,
  SubtitleRef,
  VoiceOverInfo,
} from '../../../lib/types';
import { SeasonsRef } from '../../../lib/types';
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
  const movieInfo = useMovieInfo(pageType);
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

    logger.info('Attempt to update voice over.');
    if (!voiceOver) return;
    logger.debug('Voice over:', voiceOver);
    if (isFirstLoad) {
      setIsFirstLoad(false);
      return;
    }
    logger.info('Start update voice over.');
    browser.runtime
      .sendMessage<Message<DataForUpdate>>({
        type: 'updateTranslateInfo',
        message: {
          siteURL: movieInfo!.url!,
          movieData: {
            id: movieInfo!.data.id,
            translator_id: voiceOver.id,
            favs: movieInfo!.data.favs,
            action: 'get_episodes',
          },
        },
      })
      .then((response) => {
        const result = response as ActualVoiceOverData;
        logger.debug('Set new popup data:', result);
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

    logger.info('Attempt to update current episode.');
    if (!range) return;
    logger.debug('Range episodes:', range);
    const isFirstUpdate = currentEpisode === null;

    const seasonID = isFirstUpdate
      ? (movieInfo?.data as SerialData).season
      : Object.keys(range).sort((a, b) => Number(a) - Number(b))[0];

    const episodeID = isFirstUpdate
      ? (movieInfo?.data as SerialData).episode
      : range[seasonID].episodes[0].id;

    const newCurrentEpisode: CurrentEpisode = { seasonID, episodeID };
    if (JSON.stringify(currentEpisode) === JSON.stringify(newCurrentEpisode))
      return;

    logger.debug('Set new current episode:', newCurrentEpisode);
    setCurrentEpisode(newCurrentEpisode);

    if (isFirstUpdate) return;

    logger.info('Start update episodes info.');
    browser.runtime
      .sendMessage<Message<DataForUpdate>>({
        type: 'updateEpisodesInfo',
        message: {
          siteURL: movieInfo!.url!,
          movieData: {
            id: movieInfo!.data.id,
            translator_id: voiceOver!.id,
            season: newCurrentEpisode!.seasonID,
            episode: newCurrentEpisode!.episodeID,
            favs: movieInfo!.data.favs,
            action: 'get_stream',
          } satisfies Fields & SerialFields,
        },
      })
      .then((response) => {
        const result = response as ActualEpisodeData;
        logger.debug('Set new episodes info:', result);
        subtitleRef.current?.setSubtitles(result.subtitle);
        qualityRef.current?.setStreams(result.streams);
      });
  }, [range]);

  useEffect(() => {
    logger.info('Attempt to update movieInfo');
    if (!movieInfo) return;
    logger.debug('Update movieInfo', movieInfo);
    qualityRef.current?.setStreams(movieInfo.streams);
    subtitleRef.current?.setSubtitles(movieInfo.subtitle);
  }, [movieInfo]);

  if (movieInfo === null || !movieInfo.success) {
    logger.info('"MovieInfo" is missing.');
    return null;
  }
  logger.info('New render DownloadScreen component.');

  return (
    <div className='flex size-full flex-col gap-5'>
      <div className='relative flex items-center justify-center'>
        <button
          className='flex size-[120px] cursor-pointer items-center justify-center rounded-full bg-popup-border text-white hover:bg-input'
          onClick={() => {
            browser.runtime
              .sendMessage<Message<Initiator>>({
                type: 'trigger',
                message: {
                  query_data: movieInfo!.data,
                  site_url: movieInfo!.url!,
                  range: range,
                  local_film_name: movieInfo!.filename.local,
                  original_film_name: movieInfo!.filename.origin,
                  voice_over: voiceOver!,
                  quality: qualityRef.current!.quality,
                  subtitle: subtitleRef.current!.subtitleLang,
                  timestamp: new Date(),
                },
              })
              .then();
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
          defaultSeasonStart={(movieInfo?.data as SerialData).season}
          defaultEpisodeStart={(movieInfo?.data as SerialData).episode}
          downloadSerial={downloadSerial}
          setDownloadSerial={setDownloadSerial}
          setRange={setRange}
        />

        <SubtitleSelector subtitleRef={subtitleRef} />
        {/*TODO: скрывать разделитель после закрытия ошибки если нет других элементов*/}
        {/*Добавляем разделитель если это сериал или есть субтитры или ошибка*/}
        {(pageType === 'SERIAL' ||
          movieInfo?.subtitle?.subtitle ||
          notificationString) && (
          <hr className='w-full border-b border-popup-border' />
        )}

        <VoiceOverSelector
          pageType={pageType}
          defaultVoiceOverId={movieInfo!.data.translator_id}
          is_camrip={(movieInfo?.data as FilmData)?.is_camrip}
          is_director={(movieInfo?.data as FilmData)?.is_director}
          is_ads={(movieInfo?.data as FilmData)?.is_ads}
          voiceOver={voiceOver}
          setVoiceOver={setVoiceOver}
          downloadSerial={downloadSerial}
        />
        <QualitySelector qualityRef={qualityRef} />
      </div>
    </div>
  );
}
