import { useContext, useEffect, useState } from 'react';
import { DividingLine } from '../../../../components/DividingLine';
import { Menu } from '../../../../components/Menu';
import { getMovieInfo } from '../../../../extraction-scripts/extractMovieInfo';
import { PopupInitialDataContext } from '../../../../html/popup';
import type {
  ActualVideoData,
  CurrentEpisode,
  DataForUpdate,
  Fields,
  FilmData,
  Message,
  SerialData,
  SerialFields,
} from '../../../../lib/types';
import { normalizeJSON } from '../../../../lib/utils';
import { ProcessingScreen } from '../ProcessingScreen';
import { EpisodeRangeSelector } from './EpisodeRangeSelector';
import { LoadButton } from './LoadButton';
import { NotificationField } from './NotificationField';
import { QualitySelector } from './QualitySelector';
import {
  selectCurrentEpisode,
  selectMovieInfo,
  setCurrentEpisodeAction,
  setMovieInfoAction,
} from './store/DownloadScreen.slice';
import {
  selectRange,
  setSeasonsAction,
} from './store/EpisodeRangeSelector.slice';
import { selectNotification } from './store/NotificationField.slice';
import {
  setCurrentQualityAction,
  setQualitiesListAction,
} from './store/QualitySelector.slice';
import { useAppDispatch, useAppSelector } from './store/store';
import {
  selectCurrentSubtitle,
  setSubtitleListAction,
} from './store/SubtitleSelector.slice';
import { selectCurrentVoiceOver } from './store/VoiceOverSelector.slice';
import { SubtitleSelector } from './SubtitleSelector';
import { VoiceOverSelector } from './VoiceOverSelector';

export function DownloadScreen() {
  const dispatch = useAppDispatch();
  const { tabId, pageType } = useContext(PopupInitialDataContext)!;

  const movieInfo = useAppSelector((state) => selectMovieInfo(state));
  const range = useAppSelector((state) => selectRange(state));
  const voiceOver = useAppSelector((state) => selectCurrentVoiceOver(state));
  const notification = useAppSelector((state) => selectNotification(state));
  const subtitleLang = useAppSelector((state) => selectCurrentSubtitle(state));
  const currentEpisode = useAppSelector((state) => selectCurrentEpisode(state));

  const [isFirstLoad, setIsFirstLoad] = useState(true);
  // TODO: убрать хуки отсюда
  useEffect(() => {
    // При обновлении озвучки мы должны обновить список эпизодов (если есть),
    // после, мы должны установить стартовый сезон и эпизод. Вследствие чего
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
        type: 'updateVideoInfo',
        message: {
          siteURL: movieInfo!.url,
          movieData:
            pageType === 'SERIAL'
              ? {
                  id: movieInfo!.data.id,
                  translator_id: voiceOver.id,
                  favs: movieInfo!.data.favs,
                  action: 'get_episodes',
                }
              : {
                  id: movieInfo!.data.id,
                  translator_id: voiceOver.id,
                  is_camrip: voiceOver.is_camrip!,
                  is_ads: voiceOver.is_ads!,
                  is_director: voiceOver.is_director!,
                  favs: movieInfo!.data.favs,
                  action: 'get_movie',
                },
        },
      })
      .then((response) => {
        const result = response as ActualVideoData;
        logger.debug('Set new popup data:', result);

        dispatch(setSubtitleListAction({ subtitlesInfo: result.subtitle }));
        dispatch(setQualitiesListAction({ stream: result.streams }));

        if (result.seasons) {
          dispatch(setSeasonsAction({ seasons: result.seasons }));
          const seasonID = Object.keys(result.seasons)[0];
          const episodeID = result.seasons[seasonID].episodes[0].id;
          dispatch(
            setCurrentEpisodeAction({
              currentEpisode: { seasonID, episodeID },
            }),
          );
        }
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
    if (
      normalizeJSON(currentEpisode ?? {}) === normalizeJSON(newCurrentEpisode)
    )
      return;

    dispatch(setCurrentEpisodeAction({ currentEpisode: newCurrentEpisode }));

    if (isFirstUpdate) return;

    logger.info('Start update episodes info.');
    browser.runtime
      .sendMessage<Message<DataForUpdate>>({
        type: 'updateVideoInfo',
        message: {
          siteURL: movieInfo!.url,
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
        const result = response as ActualVideoData;
        logger.debug('Set new episodes info:', result);
        dispatch(setSubtitleListAction({ subtitlesInfo: result.subtitle }));
        dispatch(setQualitiesListAction({ stream: result.streams }));
      });
  }, [range]);

  useEffect(() => {
    if (movieInfo !== null) return;
    logger.info('Getting movieInfo...');
    getMovieInfo(tabId).then((result) => {
      dispatch(setMovieInfoAction({ movieInfo: result }));
      if (result === null) return;
      dispatch(setSubtitleListAction({ subtitlesInfo: result.subtitle }));
      dispatch(setQualitiesListAction({ stream: result.streams }));
      dispatch(setCurrentQualityAction({ quality: result.quality }));
    });
  }, [movieInfo]);

  if (movieInfo === null || !movieInfo.success) {
    logger.info('"MovieInfo" is missing.');
    return <ProcessingScreen />;
  }

  logger.info('New render DownloadScreen component.');
  return (
    <div className='flex size-full flex-col gap-5'>
      <div className='relative flex items-center justify-center'>
        <LoadButton />
        <Menu />
      </div>
      <div className='flex w-full flex-col gap-3'>
        <NotificationField />

        <EpisodeRangeSelector
          defaultSeasonStart={(movieInfo?.data as SerialData).season}
          defaultEpisodeStart={(movieInfo?.data as SerialData).episode}
        />

        <SubtitleSelector />
        {(pageType === 'SERIAL' || subtitleLang || notification) && (
          <DividingLine />
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
