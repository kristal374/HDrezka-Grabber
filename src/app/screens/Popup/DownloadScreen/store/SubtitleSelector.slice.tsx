import { createAction, createReducer } from '@reduxjs/toolkit';
import equal from 'fast-deep-equal/es6';
import {
  decodeSubtitleURL,
  getTargetSubtitle,
} from '../../../../../lib/link-processing';
import { Subtitle, SubtitleInfo } from '../../../../../lib/types';
import { AppState } from './store';

export const setSubtitleListAction = createAction<{
  subtitlesInfo: SubtitleInfo | null;
}>('subtitle/setSubtitleList');

export const setCurrentSubtitleAction = createAction<{
  subtitle: Subtitle | null;
}>('subtitle/setCurrentSubtitle');

export const setDownloadSubtitleAction = createAction<{
  downloadSubtitle: boolean;
}>('subtitle/setDownloadSubtitle');

const initialSubtitle: {
  downloadSubtitle: boolean;
  subtitleList: Subtitle[] | null;
  subtitle: Subtitle | null;
} = {
  downloadSubtitle: false,
  subtitleList: null,
  subtitle: null,
};

export const subtitleReducer = createReducer(initialSubtitle, (builder) => {
  builder.addCase(setSubtitleListAction, (state, action) => {
    const subtitleArray = decodeSubtitleURL(action.payload.subtitlesInfo);
    logger.debug('Set subtitleList:', subtitleArray);
    if (subtitleArray === null) {
      state.subtitle = null;
      state.downloadSubtitle = false;
    } else if (
      state.subtitle !== null &&
      subtitleArray.filter((subtitle) => equal(subtitle, state.subtitle ?? {}))
        .length === 0
    ) {
      const targetSubtitleItem = getTargetSubtitle(
        subtitleArray,
        state.subtitle!.code,
      );
      logger.debug('Set new subtitle:', targetSubtitleItem);
      state.subtitle = targetSubtitleItem;
    } else {
      const targetSubtitleItem = getTargetSubtitle(
        subtitleArray,
        action.payload.subtitlesInfo!.subtitle_def as string,
      );
      logger.debug('Set new subtitle:', targetSubtitleItem);
      state.subtitle = targetSubtitleItem;
    }
    state.subtitleList = subtitleArray;
  });
  builder.addCase(setCurrentSubtitleAction, (state, action) => {
    logger.debug('Set new subtitle:', action.payload.subtitle);
    state.subtitle = action.payload.subtitle;
  });
  builder.addCase(setDownloadSubtitleAction, (state, action) => {
    logger.debug('Update downloadSubtitle:', action.payload.downloadSubtitle);
    state.downloadSubtitle = action.payload.downloadSubtitle;
  });
});

export const selectSubtitleList = (state: AppState) =>
  state.subtitleReducer.subtitleList;
export const selectCurrentSubtitle = (state: AppState) =>
  state.subtitleReducer.subtitle;
export const selectDownloadSubtitle = (state: AppState) =>
  state.subtitleReducer.downloadSubtitle;
