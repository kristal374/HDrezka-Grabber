import { createAction, createReducer } from '@reduxjs/toolkit';
import { decodeVideoURL } from '../../../../../lib/link-processing';
import {
  QualitiesList,
  type QualityItem,
  URLsContainer,
} from '../../../../../lib/types';
import { AppState } from './store';

export const setQualitiesListAction = createAction<{
  stream: string | false;
}>('quality/setQualityList');

export const setCurrentQualityAction = createAction<{
  quality: QualityItem | null;
}>('quality/setCurrentQuality');

export const setQualitiesSizesAction = createAction<{
  qualitiesSizes: URLsContainer | null;
}>('quality/setQualitiesSizes');

const initialQualities: {
  quality: QualityItem | null;
  qualitiesList: QualitiesList | null;
  qualitiesSizes: URLsContainer | null;
} = {
  quality: null,
  qualitiesList: null,
  qualitiesSizes: null,
};

export const qualityReducer = createReducer(initialQualities, (builder) => {
  builder.addCase(setQualitiesListAction, (state, action) => {
    const qualitiesList = decodeVideoURL(action.payload.stream);
    logger.debug('Set QualitiesList:', qualitiesList);
    if (qualitiesList !== null) {
      const qualities = Object.keys(qualitiesList) as QualityItem[];
      if (state.quality && !qualities.includes(state.quality))
        state.quality = qualities.at(-1) as QualityItem;
    }
    state.qualitiesList = qualitiesList;
    state.qualitiesSizes = null;
  });
  builder.addCase(setCurrentQualityAction, (state, action) => {
    logger.debug('Set new quality:', action.payload.quality);
    state.quality = action.payload.quality;
  });
  builder.addCase(setQualitiesSizesAction, (state, action) => {
    logger.debug('Set qualitiesSizes:', action.payload.qualitiesSizes);
    state.qualitiesSizes = action.payload.qualitiesSizes;
  });
});

export const selectQualitiesList = (state: AppState) =>
  state.qualityReducer.qualitiesList;
export const selectCurrentQuality = (state: AppState) =>
  state.qualityReducer.quality;
export const selectQualitiesSizes = (state: AppState) =>
  state.qualityReducer.qualitiesSizes;
