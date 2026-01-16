import { PopupNotification } from '@/lib/notification/message-broker';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { AppState } from './store';

export const setNotificationAction = createAction<{
  notification: PopupNotification;
}>('notification/setNotification');

export const deleteNotificationsAction = createAction<{
  notificationText: string;
}>('notification/deleteNotificationsAction');

const initialNotification: {
  notifications: PopupNotification[];
} = {
  notifications: [],
};

export const notificationReducer = createReducer(
  initialNotification,
  (builder) => {
    builder.addCase(setNotificationAction, (state, action) => {
      logger.debug('Set new notification:', action.payload.notification);
      state.notifications.push(action.payload.notification);
    });
    builder.addCase(deleteNotificationsAction, (state, action) => {
      logger.debug('Delete notifications:', action.payload.notificationText);
      state.notifications = state.notifications.filter(
        (notification) =>
          notification.message !== action.payload.notificationText,
      );
    });
  },
);

export const selectNotifications = (state: AppState) =>
  state.notificationReducer.notifications;
