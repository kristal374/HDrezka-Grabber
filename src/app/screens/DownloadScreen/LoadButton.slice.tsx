import { createAction, createReducer } from '@reduxjs/toolkit';
import { LoadConfig } from '../../../lib/types';
import { AppState } from '../../../store';

export const setLoadConfigIdAction = createAction<{
  loadConfig: LoadConfig | null;
}>('loadButton/setLoadConfig');

const initialLoadButton: {
  loadConfig: LoadConfig | null;
} = {
  loadConfig: null,
};

export const loadButtonReducer = createReducer(initialLoadButton, (builder) => {
  builder.addCase(setLoadConfigIdAction, (state, action) => {
    logger.debug('Set new LoadConfig:', action.payload.loadConfig);
    state.loadConfig = action.payload.loadConfig;
  });
});

export const selectLoadConfig = (state: AppState) =>
  state.loadButtonReducer.loadConfig;
