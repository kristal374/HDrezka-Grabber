import {
  selectCurrentEpisode,
  selectMovieInfo,
  setCurrentEpisodeAction,
} from '@/app/screens/Popup/DownloadScreen/store/DownloadScreen.slice';
import {
  selectRange,
  selectSeasons,
  setEpisodeFromAction,
  setEpisodeToAction,
  setSeasonFromAction,
  setSeasonToAction,
} from '@/app/screens/Popup/DownloadScreen/store/EpisodeRangeSelector.slice';
import { setQualitiesListAction } from '@/app/screens/Popup/DownloadScreen/store/QualitySelector.slice';
import {
  useAppDispatch,
  useAppSelector,
} from '@/app/screens/Popup/DownloadScreen/store/store';
import { setSubtitleListAction } from '@/app/screens/Popup/DownloadScreen/store/SubtitleSelector.slice';
import { selectCurrentVoiceOver } from '@/app/screens/Popup/DownloadScreen/store/VoiceOverSelector.slice';
import type {
  ActualVideoData,
  CurrentEpisode,
  DataForUpdate,
  Fields,
  Message,
  SerialData,
  SerialFields,
} from '@/lib/types';
import equal from 'fast-deep-equal/es6';
import { useCallback, useEffect, useState } from 'react';

export function useChangeRangeEpisodes() {
  const dispatch = useAppDispatch();

  const movieInfo = useAppSelector(selectMovieInfo);
  const range = useAppSelector(selectRange);
  const seasons = useAppSelector(selectSeasons);
  const voiceOver = useAppSelector(selectCurrentVoiceOver);
  const currentEpisode = useAppSelector(selectCurrentEpisode);
  const [previewRange, setPreviewRange] = useState(range);

  const updateCurrentEpisode = useCallback(
    async (newCurrentEpisode: CurrentEpisode) => {
      if (!movieInfo || !voiceOver || !currentEpisode) {
        throw new Error('Absent movieInfo, voiceOver or currentEpisode.');
      }

      return (await browser.runtime.sendMessage<Message<DataForUpdate>>({
        type: 'updateVideoInfo',
        message: {
          siteURL: movieInfo.url,
          movieData: {
            id: movieInfo.data.id,
            translator_id: voiceOver.id,
            season: newCurrentEpisode.seasonID,
            episode: newCurrentEpisode.episodeID,
            favs: movieInfo.data.favs,
            action: 'get_stream',
          } satisfies Fields & SerialFields,
        },
      })) as ActualVideoData;
    },
    [movieInfo, voiceOver],
  );

  useEffect(() => {
    // При обновлении range-а мы должны отслеживать только самый первый эпизод
    // в списке. При обновлении данных эпизода мы должны обновить списки
    // доступного качества и субтитров.
    //
    // Первое обновление данных должно игнорироваться т.к. данные мы
    // подтягиваем со страницы фильма и они уже являются актуальными.

    logger.info('Attempt to update current episode.');

    if (!range || equal(range, previewRange)) return;
    logger.debug('Range episodes:', range);

    const isFirstUpdate = currentEpisode === null;

    const seasonID = isFirstUpdate
      ? (movieInfo?.data as SerialData).season
      : Object.keys(range).sort((a, b) => Number(a) - Number(b))[0];

    const episodeID = isFirstUpdate
      ? (movieInfo?.data as SerialData).episode
      : range[seasonID]?.episodes[0].id;

    const newCurrentEpisode: CurrentEpisode = { seasonID, episodeID };

    if (equal(currentEpisode ?? {}, newCurrentEpisode)) {
      setPreviewRange(range);
      return;
    }
    if (!previewRange) {
      dispatch(setCurrentEpisodeAction({ currentEpisode: newCurrentEpisode }));
      setPreviewRange(range);
      return;
    }

    logger.info('Start update episodes info.');
    let ignore = false;
    updateCurrentEpisode(newCurrentEpisode)
      .then((response) => {
        if (ignore) return;
        logger.debug('Set new episodes info:', response);

        dispatch(
          setCurrentEpisodeAction({ currentEpisode: newCurrentEpisode }),
        );
        dispatch(setSubtitleListAction({ subtitlesInfo: response.subtitle }));
        dispatch(setQualitiesListAction({ stream: response.streams }));
        setPreviewRange(range);
      })
      .catch((error) => {
        if (ignore) return;
        logger.error('Error update episodes info:', error);

        const seasonIds = Object.keys(previewRange);
        const startEpisode = previewRange[seasonIds[0]].episodes[0].id;
        const endEpisode = previewRange[seasonIds.at(-1)!].episodes.at(-1)!.id;

        dispatch(setSeasonFromAction({ value: seasonIds[0] }));
        dispatch(setEpisodeFromAction({ value: startEpisode }));
        if (
          Object.keys(seasons!).at(-1) === seasonIds.at(-1)! &&
          seasons![seasonIds.at(-1)!].episodes.at(-1)!.id === endEpisode
        ) {
          dispatch(setSeasonToAction({ value: '-2' }));
          dispatch(setEpisodeToAction({ value: '' }));
        } else if (
          seasonIds.at(-1) === seasonIds[0] &&
          seasons![seasonIds.at(-1)!].episodes.at(-1)!.id === endEpisode
        ) {
          dispatch(setSeasonToAction({ value: '-1' }));
          dispatch(setEpisodeToAction({ value: '' }));
        } else {
          dispatch(setSeasonToAction({ value: seasonIds.at(-1)! }));
          dispatch(setEpisodeToAction({ value: endEpisode }));
        }
        messageBroker.sendMessage(movieInfo!.data.id, {
          stackable: true,
          message: browser.i18n.getMessage('popup_error_update_episode'),
          type: 'error',
        });
      });
    return () => {
      ignore = true;
    };
  }, [range]);
}
