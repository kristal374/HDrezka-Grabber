import {
  setMovieInfoAction,
  setUseCloudflareBypassAction,
} from '@/app/screens/Popup/DownloadScreen/store/DownloadScreen.slice';
import { setDefaultSeasonsAction } from '@/app/screens/Popup/DownloadScreen/store/EpisodeRangeSelector.slice';
import {
  setCurrentQualityAction,
  setQualitiesListAction,
} from '@/app/screens/Popup/DownloadScreen/store/QualitySelector.slice';
import { useAppDispatch } from '@/app/screens/Popup/DownloadScreen/store/store';
import { setSubtitleListAction } from '@/app/screens/Popup/DownloadScreen/store/SubtitleSelector.slice';
import {
  setVoiceOverAction,
  setVoiceOverListAction,
} from '@/app/screens/Popup/DownloadScreen/store/VoiceOverSelector.slice';
import { getMovieInfo } from '@/extraction-scripts/extractMovieInfo';
import { getSeasons } from '@/extraction-scripts/extractSeasons';
import { getVoiceOverList } from '@/extraction-scripts/extractVoiceOverList';
import { PopupInitialDataContext } from '@/html/popup';
import {
  type ActualVideoData,
  type DataForUpdate,
  type Fields,
  FilmData,
  FilmsFields,
  type Message,
  MovieInfo,
  PageType,
  type QueryData,
  type SerialData,
  type SerialFields,
  VoiceOverInfo,
} from '@/lib/types';
import { useContext, useEffect } from 'react';

export function useInitData() {
  const dispatch = useAppDispatch();
  const { tabId, pageType } = useContext(PopupInitialDataContext)!;

  useEffect(() => {
    const asyncInit = async () => {
      // TODO: Добавить уведомление для пользователя об отсутствии данных
      const movieInfo = await getMovieInfo(tabId!);
      if (movieInfo === null) return;

      const voiceOverList = await getVoiceOverList(tabId!);
      if (!voiceOverList) return;

      const seasons = await getSeasons(tabId!, pageType);

      const defaultSeason = (movieInfo?.data as SerialData).season;
      const defaultEpisode = (movieInfo?.data as SerialData).episode;
      const voiceOver = getTargetVoiceOver(pageType, movieInfo, voiceOverList)!;

      const defaultFields = {
        id: movieInfo.data.id,
        translator_id: voiceOver.id,
        favs: movieInfo.data.favs,
      } satisfies Fields;
      const serialField = {
        season: defaultSeason,
        episode: defaultEpisode,
        action: 'get_stream',
      } satisfies SerialFields;
      const filmsField = {
        is_camrip: voiceOver.is_camrip!,
        is_director: voiceOver.is_director!,
        is_ads: voiceOver.is_ads!,
        action: 'get_movie',
      } satisfies FilmsFields;

      const actualPlayerInfo = await updatePlayerInfo(tabId!, movieInfo.url, {
        ...defaultFields,
        ...(pageType === 'SERIAL' ? serialField : filmsField),
      });

      dispatch(setMovieInfoAction({ movieInfo }));
      dispatch(
        setUseCloudflareBypassAction({
          useCloudflareBypass: actualPlayerInfo.cloudflareProtectedIsUsed,
        }),
      );

      dispatch(
        setSubtitleListAction({ subtitlesInfo: actualPlayerInfo.subtitle }),
      );
      dispatch(setQualitiesListAction({ stream: actualPlayerInfo.streams }));
      dispatch(setCurrentQualityAction({ quality: movieInfo.quality }));

      dispatch(setVoiceOverListAction({ voiceOverList }));
      dispatch(setVoiceOverAction({ voiceOver }));

      if (seasons) {
        dispatch(
          setDefaultSeasonsAction({ seasons, defaultSeason, defaultEpisode }),
        );
      }
    };

    asyncInit();
  }, []);
}

async function updatePlayerInfo(
  tabId: number,
  siteURL: string,
  movieData: QueryData,
) {
  return (await browser.runtime.sendMessage<Message<DataForUpdate>>({
    type: 'updateVideoInfo',
    message: { tabId, useCloudflareBypass: false, siteURL, movieData },
  })) as ActualVideoData;
}

function getTargetVoiceOver(
  pageType: PageType,
  movieInfo: MovieInfo,
  voiceOverList: VoiceOverInfo[],
) {
  return (
    voiceOverList.find((voiceOver) =>
      pageType === 'SERIAL'
        ? voiceOver.id === movieInfo.data.translator_id
        : voiceOver.id === movieInfo.data.translator_id &&
          voiceOver.is_camrip === (movieInfo?.data as FilmData)?.is_camrip &&
          voiceOver.is_director ===
            (movieInfo?.data as FilmData)?.is_director &&
          voiceOver.is_ads === (movieInfo?.data as FilmData)?.is_ads,
    ) || null
  );
}
