import type { CurrentEpisode, MovieInfo } from '@/lib/types';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { AppState } from './store';

export const setMovieInfoAction = createAction<{
  movieInfo: MovieInfo | null;
}>('main/setMovieInfo');

export const setCurrentEpisodeAction = createAction<{
  currentEpisode: CurrentEpisode | null;
}>('main/setCurrentEpisode');

const initialMain: {
  movieInfo: MovieInfo | null;
  currentEpisode: CurrentEpisode | null;
} = {
  movieInfo: null,
  currentEpisode: null,
};

export const mainComponentReducer = createReducer(initialMain, (builder) => {
  builder.addCase(setMovieInfoAction, (state, action) => {
    logger.debug('Set movieInfo:', action.payload.movieInfo);
    state.movieInfo = action.payload.movieInfo;
  });
  builder.addCase(setCurrentEpisodeAction, (state, action) => {
    logger.debug('Set currentEpisode:', action.payload.currentEpisode);
    state.currentEpisode = action.payload.currentEpisode;
  });
});

export const selectMovieInfo = (state: AppState) =>
  state.mainComponentReducer.movieInfo;
export const selectCurrentEpisode = (state: AppState) =>
  state.mainComponentReducer.currentEpisode;
