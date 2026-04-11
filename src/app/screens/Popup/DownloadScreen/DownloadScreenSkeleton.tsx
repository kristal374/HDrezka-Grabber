import { DownloadIcon } from '@/components/icons/DownloadIcon';
import { LoadAnimation } from '@/components/icons/LoadAnimation';
import { useEffect, useState } from 'react';
import { DefaultScreen } from '../DefaultScreen';

export function DownloadScreenSkeleton() {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(true);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  return (
    <DefaultScreen className='py-0'>
      <div className='bg-popup-border flex size-30 items-center justify-center rounded-full text-white'>
        {showLoader ? (
          <LoadAnimation size={128} fill='white' />
        ) : (
          <DownloadIcon className='size-19' />
        )}
      </div>
    </DefaultScreen>
  );
}
