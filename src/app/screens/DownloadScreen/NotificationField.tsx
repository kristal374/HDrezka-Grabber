import { useAppDispatch, useAppSelector } from '../../../store';
import {
  selectNotification,
  setNotificationAction,
} from './NotificationField.slice';

export function NotificationField() {
  const dispatch = useAppDispatch();
  const notification = useAppSelector((state) => selectNotification(state));

  if (!notification) return null;

  logger.info('New render NotificationField component.');
  return (
    <div className='relative flex items-center rounded bg-error px-1.5 py-1 text-white'>
      <p className='flex-grow break-all pr-6 text-sm'>{notification}</p>
      <button
        className='absolute right-3 text-sm font-bold text-white'
        onClick={() => dispatch(setNotificationAction({ notification: null }))}
      >
        ✕
      </button>
    </div>
  );
}
