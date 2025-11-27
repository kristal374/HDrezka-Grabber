import { Button } from '@/components/ui/Button';
import { EventType, Message } from '@/lib/types';
import { XIcon } from 'lucide-react';
import { Fragment, useEffect } from 'react';
import type { Runtime } from 'webextension-polyfill';
import { selectMovieInfo } from './store/DownloadScreen.slice';
import {
  selectNotification,
  setNotificationAction,
} from './store/NotificationField.slice';
import { useAppDispatch, useAppSelector } from './store/store';

type MessageSender = Runtime.MessageSender;

export function NotificationField() {
  const dispatch = useAppDispatch();
  const movieInfo = useAppSelector(selectMovieInfo)!;
  const notification = useAppSelector((state) => selectNotification(state));

  useEffect(() => {
    eventBus.addMessageSource(
      EventType.NewMessageReceived,
      browser.runtime.onMessage,
    );
    eventBus.on(
      EventType.NewMessageReceived,
      (
        message: unknown,
        _sender: MessageSender,
        _sendResponse: (message: unknown) => void,
      ) => {
        const data = message as Message<any>;
        if (
          data.type === 'setNotification' &&
          movieInfo.data.id === data.message.movieId
        ) {
          dispatch(
            setNotificationAction({ notification: data.message.notification }),
          );
          return 'ok';
        } else return false;
      },
    );
  }, []);

  if (!notification) return null;

  logger.info('New render NotificationField component.');
  return (
    <div className='bg-error text-light-color relative flex items-start gap-3 rounded-md px-2 pt-1.25 pb-1.5 text-sm'>
      <p className='flex-grow text-balance'>
        {notification.split('. ').map((text, i, arr) => {
          return (
            <Fragment key={text}>
              {text}
              {i + 1 < arr.length && (
                <>
                  .<br />
                </>
              )}
            </Fragment>
          );
        })}
      </p>
      <Button
        variant='dangerous'
        size='square'
        className='mt-0.5 !text-white not-disabled:active:scale-92'
        onClick={() => dispatch(setNotificationAction({ notification: null }))}
      >
        <XIcon className='size-4.5' />
      </Button>
    </div>
  );
}
