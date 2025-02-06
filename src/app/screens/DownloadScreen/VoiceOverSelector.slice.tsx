import { createAction, createReducer } from '@reduxjs/toolkit';
import { VoiceOverInfo } from '../../../lib/types';
import { AppState } from '../../../store';

export const setVoiceOverListAction = createAction<{
  voiceOverList: VoiceOverInfo[] | null;
}>('voiceOver/setVoiceOverList');

export const setVoiceOverAction = createAction<{
  voiceOver: VoiceOverInfo | null;
}>('voiceOver/setVoiceOver');

const initialVoiceOver: {
  voiceOverList: VoiceOverInfo[] | null;
  currentVoiceOver: VoiceOverInfo | null;
} = {
  voiceOverList: null,
  currentVoiceOver: null,
};

export const voiceOverReducer = createReducer(initialVoiceOver, (builder) => {
  builder.addCase(setVoiceOverListAction, (state, action) => {
    logger.debug('Set voiceOverList:', action.payload.voiceOverList);
    state.voiceOverList = action.payload.voiceOverList;
  });
  builder.addCase(setVoiceOverAction, (state, action) => {
    logger.debug('Set new voiceOver:', action.payload.voiceOver);
    state.currentVoiceOver = action.payload.voiceOver;
  });
});

export const selectVoiceOverList = (state: AppState) =>
  state.voiceOverReducer.voiceOverList;
export const selectCurrentVoiceOver = (state: AppState) =>
  state.voiceOverReducer.currentVoiceOver;
