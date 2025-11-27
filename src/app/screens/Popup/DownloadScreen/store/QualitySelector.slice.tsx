import { decodeVideoURL } from '@/lib/link-processing';
import { QualitiesList, type QualityItem, URLsContainer } from '@/lib/types';
import { createAction, createReducer } from '@reduxjs/toolkit';
import equal from 'fast-deep-equal/es6';
import { AppState } from './store';

export const setQualitiesListAction = createAction<{
  stream: string | false;
}>('quality/setQualityList');

export const setCurrentQualityAction = createAction<{
  quality: QualityItem | null;
}>('quality/setCurrentQuality');

export const addQualityInfoAction = createAction<{
  qualityInfo: URLsContainer | null;
}>('quality/addQualityInfo');

const initialQualities: {
  quality: QualityItem | null;
  qualitiesList: QualitiesList | null;
  qualityInfo: URLsContainer | null;
} = {
  quality: null,
  qualitiesList: null,
  qualityInfo: null,
};

export const qualityReducer = createReducer(initialQualities, (builder) => {
  builder.addCase(setQualitiesListAction, (state, action) => {
    const qualitiesList = decodeVideoURL(action.payload.stream);

    if (equal(state.qualitiesList, qualitiesList)) return;
    logger.debug('Set QualitiesList:', qualitiesList);
    if (qualitiesList !== null) {
      const qualities = Object.keys(qualitiesList) as QualityItem[];
      if (state.quality && !qualities.includes(state.quality))
        state.quality = qualities.at(-1) as QualityItem;
    }
    state.qualitiesList = qualitiesList;
    state.qualityInfo = {};
  });
  builder.addCase(setCurrentQualityAction, (state, action) => {
    logger.debug('Set new quality:', action.payload.quality);
    state.quality = action.payload.quality;
  });
  builder.addCase(addQualityInfoAction, (state, action) => {
    logger.debug('Add qualityInfo item(s):', action.payload.qualityInfo);
    state.qualityInfo = {
      ...state.qualityInfo,
      ...action.payload.qualityInfo,
    };
  });
});

export const selectQualitiesList = (state: AppState) =>
  state.qualityReducer.qualitiesList;
export const selectCurrentQuality = (state: AppState) =>
  state.qualityReducer.quality;
export const selectQualityInfo = (state: AppState) =>
  state.qualityReducer.qualityInfo;
