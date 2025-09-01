import {
  combineReducers,
  configureStore,
  createAction,
  createSelector,
} from '@reduxjs/toolkit';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { mainComponentReducer } from './app/screens/DownloadScreen/DownloadScreen.slice';
import { serialReducer } from './app/screens/DownloadScreen/EpisodeRangeSelector.slice';
import { notificationReducer } from './app/screens/DownloadScreen/NotificationField.slice';
import { qualityReducer } from './app/screens/DownloadScreen/QualitySelector.slice';
import { subtitleReducer } from './app/screens/DownloadScreen/SubtitleSelector.slice';
import { voiceOverReducer } from './app/screens/DownloadScreen/VoiceOverSelector.slice';

export const resetAction = createAction<{
  data: Record<string, any>;
}>('reset');

const rootReducer = (state: any, action: any) => {
  const mainReducer = combineReducers({
    mainComponentReducer,
    serialReducer,
    voiceOverReducer,
    qualityReducer,
    subtitleReducer,
    notificationReducer,
  });
  if (action.type === resetAction.type) {
    return action.payload.data as ReturnType<typeof mainReducer>;
  }
  return mainReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});

export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppSelector = useSelector.withTypes<AppState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppStore = useStore.withTypes<typeof store>();
export const createAppSelector = createSelector.withTypes<AppState>();
