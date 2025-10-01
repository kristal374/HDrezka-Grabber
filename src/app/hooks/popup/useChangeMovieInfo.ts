import { useContext, useEffect } from 'react';
import { getMovieInfo } from '../../../extraction-scripts/extractMovieInfo';
import { PopupInitialDataContext } from '../../../html/popup';
import {
  selectMovieInfo,
  setMovieInfoAction,
} from '../../screens/Popup/DownloadScreen/store/DownloadScreen.slice';
import {
  setCurrentQualityAction,
  setQualitiesListAction,
} from '../../screens/Popup/DownloadScreen/store/QualitySelector.slice';
import {
  useAppDispatch,
  useAppSelector,
} from '../../screens/Popup/DownloadScreen/store/store';
import { setSubtitleListAction } from '../../screens/Popup/DownloadScreen/store/SubtitleSelector.slice';

export function useChangeMovieInfo() {
  const dispatch = useAppDispatch();
  const { tabId } = useContext(PopupInitialDataContext)!;

  const movieInfo = useAppSelector((state) => selectMovieInfo(state));

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
}
