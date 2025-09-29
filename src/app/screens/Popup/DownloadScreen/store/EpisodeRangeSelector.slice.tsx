import { createAction, createReducer } from '@reduxjs/toolkit';
import { SeasonsWithEpisodesList } from '../../../../../lib/types';
import { AppState } from './store';

export const setDownloadSerialAction = createAction<{
  downloadSerial: boolean;
}>('serial/setDownloadSerial');

export const setDefaultSeasonsAction = createAction<{
  seasons: SeasonsWithEpisodesList | null;
  defaultSeason: string;
  defaultEpisode: string;
}>('serial/setDefaultSeasons');

export const setSeasonsAction = createAction<{
  seasons: SeasonsWithEpisodesList | null;
}>('serial/setSeasons');

export const setRangeAction = createAction<{
  range: SeasonsWithEpisodesList | null;
}>('serial/setRange');

export const setSeasonFromAction = createAction<{
  value: string;
}>('serial/setSeasonFrom');

export const setEpisodeFromAction = createAction<{
  value: string;
}>('serial/setEpisodeFrom');

export const setSeasonToAction = createAction<{
  value: string;
}>('serial/setSeasonTo');

export const setEpisodeToAction = createAction<{
  value: string;
}>('serial/setEpisodeTo');

const initialSerial: {
  downloadSerial: boolean;
  seasons: SeasonsWithEpisodesList | null;
  range: SeasonsWithEpisodesList | null;
  seasonFrom: string;
  episodeFrom: string;
  seasonTo: string;
  episodeTo: string;
} = {
  downloadSerial: false,
  seasons: null,
  range: null,
  seasonFrom: '',
  episodeFrom: '',
  seasonTo: '-2',
  episodeTo: '',
};

export const serialReducer = createReducer(initialSerial, (builder) => {
  builder.addCase(setDownloadSerialAction, (state, action) => {
    logger.debug('Update downloadSerial:', action.payload.downloadSerial);
    state.downloadSerial = action.payload.downloadSerial;
  });
  builder.addCase(setDefaultSeasonsAction, (state, action) => {
    logger.debug('Set default season:', action.payload.seasons);
    state.seasons = action.payload.seasons;
    state.seasonFrom = action.payload.defaultSeason;
    state.episodeFrom = action.payload.defaultEpisode;
  });
  builder.addCase(setSeasonsAction, (state, action) => {
    const seasonsList = action.payload.seasons;
    logger.debug('Set new seasons:', seasonsList);
    if (seasonsList !== null) {
      const startSeason = Object.keys(seasonsList)[0];
      const startEpisode = seasonsList[startSeason].episodes[0].id;
      state.seasonFrom = startSeason;
      state.episodeFrom = startEpisode;
      if (
        !(
          state.seasonTo in seasonsList &&
          seasonsList[state.seasonTo].episodes
            .map((e) => e.id)
            .includes(state.episodeTo)
        )
      ) {
        state.seasonTo = '-2';
        state.episodeTo = '';
      }
    }
    state.seasons = seasonsList;
  });
  builder.addCase(setRangeAction, (state, action) => {
    logger.debug('Set new Range:', action.payload.range);
    state.range = action.payload.range;
  });
  builder.addCase(setSeasonFromAction, (state, action) => {
    logger.debug('Set new seasonFrom:', action.payload.value);
    state.seasonFrom = action.payload.value;
    state.episodeFrom = state.seasons![action.payload.value].episodes[0].id;
    if (
      !(Number(state.seasonTo) < 0) &&
      Number(state.seasonTo) < Number(action.payload.value)
    ) {
      state.seasonTo = action.payload.value;
      state.episodeTo = state.seasons![action.payload.value].episodes[0].id;
    }
  });
  builder.addCase(setEpisodeFromAction, (state, action) => {
    logger.debug('Set new episodeFrom:', action.payload.value);
    state.episodeFrom = action.payload.value;
    if (
      state.seasonTo === state.seasonFrom &&
      Number(state.episodeTo) < Number(action.payload.value)
    )
      state.episodeTo = action.payload.value;
  });
  builder.addCase(setSeasonToAction, (state, action) => {
    logger.debug('Set new seasonTo:', action.payload.value);
    state.seasonTo = action.payload.value;
    state.episodeTo =
      Number(action.payload.value) < 0
        ? ''
        : action.payload.value === state.seasonFrom
          ? state.episodeFrom
          : state.seasons![action.payload.value].episodes[0].id;
  });
  builder.addCase(setEpisodeToAction, (state, action) => {
    logger.debug('Set new episodeTo:', action.payload.value);
    state.episodeTo = action.payload.value;
  });
});

export const selectDownloadSerial = (state: AppState) =>
  state.serialReducer.downloadSerial;
export const selectSeasons = (state: AppState) => state.serialReducer.seasons;
export const selectRange = (state: AppState) => state.serialReducer.range;
export const selectSeasonFrom = (state: AppState) =>
  state.serialReducer.seasonFrom;
export const selectEpisodeFrom = (state: AppState) =>
  state.serialReducer.episodeFrom;
export const selectSeasonTo = (state: AppState) => state.serialReducer.seasonTo;
export const selectEpisodeTo = (state: AppState) =>
  state.serialReducer.episodeTo;
