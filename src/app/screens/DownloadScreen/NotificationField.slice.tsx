import { createAction, createReducer } from '@reduxjs/toolkit';
import { AppState } from '../../../store';

export const setNotificationAction = createAction<{
  notification: string | null;
}>('notification/setNotification');

const initialNotification: {
  notification: string | null;
} = {
  notification: null,
};

export const notificationReducer = createReducer(
  initialNotification,
  (builder) => {
    builder.addCase(setNotificationAction, (state, action) => {
      logger.debug('Set new notification:', action.payload.notification);
      state.notification = action.payload.notification;
    });
  },
);

export const selectNotification = (state: AppState) =>
  state.notificationReducer.notification;
