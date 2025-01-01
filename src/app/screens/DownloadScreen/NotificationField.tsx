import { useState } from 'react';

type Props = {
  notificationString: string | null;
};

export function NotificationField({ notificationString }: Props) {
  const [notification, setNotification] = useState<string | null>(
    notificationString,
  );

  if (!notification) return null;

  return (
    <div className='relative rounded bg-error px-1.5 py-1 text-white flex items-center'>
      <p className='text-sm flex-grow break-all pr-6'>{notification}</p>
      <button
        className='absolute right-3 text-white font-bold text-sm'
        onClick={() => setNotification(null)}
      >
        ✕
      </button>
    </div>
  );
}
