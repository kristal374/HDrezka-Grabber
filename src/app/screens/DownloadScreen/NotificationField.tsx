import { useState } from 'react';

type Props = {
  notificationString: string | null;
};

export function NotificationField({ notificationString }: Props) {
  const [notification, setNotification] = useState<string | null>(
    notificationString,
  );

  if (!notification) return null;
  logger.info('New render NotificationField component.');

  return (
    <div className='relative flex items-center rounded bg-error px-1.5 py-1 text-white'>
      <p className='flex-grow break-all pr-6 text-sm'>{notification}</p>
      <button
        className='absolute right-3 text-sm font-bold text-white'
        onClick={() => setNotification(null)}
      >
        ✕
      </button>
    </div>
  );
}
