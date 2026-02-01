import {
  selectMovieInfo,
  setMovieInfoAction,
} from '@/app/screens/Popup/DownloadScreen/store/DownloadScreen.slice';
import {
  setCurrentQualityAction,
  setQualitiesListAction,
} from '@/app/screens/Popup/DownloadScreen/store/QualitySelector.slice';
import {
  useAppDispatch,
  useAppSelector,
} from '@/app/screens/Popup/DownloadScreen/store/store';
import { setSubtitleListAction } from '@/app/screens/Popup/DownloadScreen/store/SubtitleSelector.slice';
import { getMovieInfo } from '@/extraction-scripts/extractMovieInfo';
import { PopupInitialDataContext } from '@/html/popup';
import { useContext, useEffect } from 'react';

export function useChangeMovieInfo() {
  const dispatch = useAppDispatch();
  const { tabId } = useContext(PopupInitialDataContext)!;

  const movieInfo = useAppSelector(selectMovieInfo);

  useEffect(() => {
    if (movieInfo !== null) return;
    logger.info('Getting movieInfo...');

    getMovieInfo(tabId!).then((result) => {
      dispatch(setMovieInfoAction({ movieInfo: result }));
      if (result === null) return;
      dispatch(setSubtitleListAction({ subtitlesInfo: result.subtitle }));
      dispatch(setQualitiesListAction({ stream: result.streams }));
      dispatch(setCurrentQualityAction({ quality: result.quality }));
    });
  }, [movieInfo]);
}
