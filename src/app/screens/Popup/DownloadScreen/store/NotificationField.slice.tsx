import { PopupNotification } from '@/lib/notification/message-broker';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { AppState } from './store';

export type RenderNotification = PopupNotification & {
  id: number;
  stack?: number[];
};

export const setNotificationAction = createAction<{
  notification: PopupNotification;
}>('notification/setNotification');

export const deleteNotificationsAction = createAction<{
  notification: RenderNotification;
}>('notification/deleteNotificationsAction');

const initialNotification: {
  notifications: Array<RenderNotification>;
  lastNotificationId: number;
} = {
  notifications: [],
  lastNotificationId: 0,
};

export const notificationReducer = createReducer(
  initialNotification,
  (builder) => {
    builder.addCase(setNotificationAction, (state, action) => {
      const notif = action.payload.notification;
      logger.debug('Set new notification:', notif);
      state.lastNotificationId += 1;
      state.notifications.push({
        ...notif,
        type: notif.type ?? 'info',
        message: notif.message ?? '',
        id: state.lastNotificationId,
      });
    });
    builder.addCase(deleteNotificationsAction, (state, action) => {
      const notification = action.payload.notification;
      const toDelete = notification.stack ?? [notification.id];
      logger.debug('Delete notifications:', toDelete);
      state.notifications = state.notifications.filter(
        (elem) => !toDelete.includes(elem.id),
      );
    });
  },
);

export const selectNotifications = (state: AppState) =>
  state.notificationReducer.notifications;
