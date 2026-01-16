import { Button } from '@/components/ui/Button';
import { XIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { selectMovieInfo } from './store/DownloadScreen.slice';
import {
  deleteNotificationsAction,
  selectNotifications,
  setNotificationAction,
} from './store/NotificationField.slice';
import { useAppDispatch, useAppSelector } from './store/store';

export function NotificationField() {
  const dispatch = useAppDispatch();
  const movieInfo = useAppSelector(selectMovieInfo)!;
  const notifications = useAppSelector((state) => selectNotifications(state));

  const notificationsForShow = useMemo(() => {
    return notifications;
  }, [notifications]);

  useEffect(() => {
    // При открытии попапа мы запрашиваем список всех уведомлений,
    // что были оставленны "на потом", и берём только те, которые были
    // адресованы нам (определяем по id фильма)
    messageBroker
      .getNotificationsFromStorage(movieInfo.data.id)
      .then(async (lostNotifications) => {
        lostNotifications.map((notification) =>
          dispatch(setNotificationAction({ notification })),
        );

        // Не забываем удалить из списка на доставку полученные уведомления
        await messageBroker.clearNotificationsFromStorage(movieInfo.data.id);

        messageBroker.trackNotifications(
          Number(movieInfo.data.id),
          async (notification) => {
            dispatch(setNotificationAction({ notification }));
          },
        );
      });
  }, []);

  if (!notifications.length) return null;

  logger.info('New render NotificationField component.');
  return notificationsForShow.map((notification) => (
    <div className='bg-error text-light-color relative flex items-start gap-3 rounded-md px-2 pt-1.25 pb-1.5 text-sm'>
      <p className='flex-grow text-balance'>{notification.message}</p>
      <Button
        variant='dangerous'
        size='square'
        className='mt-0.5 !text-white not-disabled:active:scale-92'
        onClick={() =>
          dispatch(
            deleteNotificationsAction({
              notificationText: notification.message,
            }),
          )
        }
      >
        <XIcon className='size-4.5' />
      </Button>
    </div>
  ));
}
