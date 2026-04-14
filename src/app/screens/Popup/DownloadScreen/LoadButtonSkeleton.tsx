import { DownloadIcon } from '@/components/icons/DownloadIcon';
import { LoadAnimation } from '@/components/icons/LoadAnimation';
import { useEffect, useState } from 'react';

export function LoadButtonSkeleton() {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(true);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className='bg-popup-border flex size-30 items-center justify-center rounded-full text-white'>
      {showLoader ? (
        <LoadAnimation size={128} fill='white' />
      ) : (
        <DownloadIcon className='size-19' />
      )}
    </div>
  );
}
