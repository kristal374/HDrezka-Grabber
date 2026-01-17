import { PopupNotification } from '@/lib/notification/message-broker';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { AppState } from './store';

export const setNotificationAction = createAction<{
  notification: PopupNotification;
}>('notification/setNotification');

export const deleteNotificationsAction = createAction<{
  notificationId: number;
}>('notification/deleteNotificationsAction');

const initialNotification: {
  notifications: Array<PopupNotification & { id: number }>;
  lastNotificationId: number;
} = {
  notifications: [],
  lastNotificationId: 0,
};

export const notificationReducer = createReducer(
  initialNotification,
  (builder) => {
    builder.addCase(setNotificationAction, (state, action) => {
      logger.debug('Set new notification:', action.payload.notification);
      state.lastNotificationId += 1;
      state.notifications.push({
        ...action.payload.notification,
        id: state.lastNotificationId,
      });
    });
    builder.addCase(deleteNotificationsAction, (state, action) => {
      logger.debug('Delete notifications:', action.payload.notificationId);
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload.notificationId,
      );
    });
  },
);

export const selectNotifications = (state: AppState) =>
  state.notificationReducer.notifications;
