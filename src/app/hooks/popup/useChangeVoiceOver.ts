import {
  selectMovieInfo,
  setCurrentEpisodeAction,
} from '@/app/screens/Popup/DownloadScreen/store/DownloadScreen.slice';
import { setSeasonsAction } from '@/app/screens/Popup/DownloadScreen/store/EpisodeRangeSelector.slice';
import { setQualitiesListAction } from '@/app/screens/Popup/DownloadScreen/store/QualitySelector.slice';
import {
  useAppDispatch,
  useAppSelector,
} from '@/app/screens/Popup/DownloadScreen/store/store';
import { setSubtitleListAction } from '@/app/screens/Popup/DownloadScreen/store/SubtitleSelector.slice';
import {
  selectCurrentVoiceOver,
  setVoiceOverAction,
} from '@/app/screens/Popup/DownloadScreen/store/VoiceOverSelector.slice';
import { PopupInitialDataContext } from '@/html/popup';
import type { ActualVideoData, DataForUpdate, Message } from '@/lib/types';
import equal from 'fast-deep-equal/es6';
import { useCallback, useContext, useEffect, useState } from 'react';

export function useChangeVoiceOver() {
  const dispatch = useAppDispatch();
  const { pageType } = useContext(PopupInitialDataContext)!;

  const movieInfo = useAppSelector((state) => selectMovieInfo(state));
  const voiceOver = useAppSelector((state) => selectCurrentVoiceOver(state));
  const [previewVoiceOver, setPreviewVoiceOver] = useState(voiceOver);

  const updateVoiceOver = useCallback(async (): Promise<ActualVideoData> => {
    if (!movieInfo || !voiceOver) {
      throw new Error('Absent movieInfo or voiceOver.');
    }

    return (await browser.runtime.sendMessage<Message<DataForUpdate>>({
      type: 'updateVideoInfo',
      message: {
        siteURL: movieInfo.url,
        movieData:
          pageType === 'SERIAL'
            ? {
                id: movieInfo.data.id,
                translator_id: voiceOver.id,
                favs: movieInfo.data.favs,
                action: 'get_episodes',
              }
            : {
                id: movieInfo.data.id,
                translator_id: voiceOver.id,
                is_camrip: voiceOver.is_camrip!,
                is_ads: voiceOver.is_ads!,
                is_director: voiceOver.is_director!,
                favs: movieInfo.data.favs,
                action: 'get_movie',
              },
      },
    })) as ActualVideoData;
  }, [pageType, movieInfo, voiceOver]);

  useEffect(() => {
    // При обновлении озвучки мы должны обновить список эпизодов (если есть),
    // после, мы должны установить стартовый сезон и эпизод. Вследствие чего
    // должен измениться range, где мы для первого эпизода должны получить
    // список доступных качеств и субтитров. Но при этом все данные уже придут
    // актуальными с сервера и мы не должны обновлять данные эпизода.

    logger.info('Attempt to update voice over.');

    if (!voiceOver || equal(voiceOver, previewVoiceOver)) return;
    logger.debug('Voice over:', voiceOver);

    if (!previewVoiceOver) {
      setPreviewVoiceOver(voiceOver);
      return;
    }

    logger.info('Start update voice over.');
    let ignore = false;
    updateVoiceOver()
      .then((response) => {
        if (ignore) return;
        logger.debug('Set new popup data:', response);

        dispatch(setSubtitleListAction({ subtitlesInfo: response.subtitle }));
        dispatch(setQualitiesListAction({ stream: response.streams }));

        if (response.seasons) {
          dispatch(setSeasonsAction({ seasons: response.seasons }));
          const seasonID = Object.keys(response.seasons)[0];
          const episodeID = response.seasons[seasonID].episodes[0].id;
          dispatch(
            setCurrentEpisodeAction({
              currentEpisode: { seasonID, episodeID },
            }),
          );
        }
        setPreviewVoiceOver(voiceOver);
      })
      .catch(() => {
        if (ignore) return;
        dispatch(setVoiceOverAction({ voiceOver: previewVoiceOver }));
        // TODO: use i18n
        messageBroker.sendMessage(Number(movieInfo?.data.id), {
          stackable: true,
          message: 'Ошибка при попытке смены озвучки, попробуйте снова.',
          type: 'error',
        });
      });
    return () => {
      ignore = true;
    };
  }, [voiceOver]);
}
