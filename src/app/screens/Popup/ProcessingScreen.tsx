import { DownloadIcon } from 'lucide-react';
import { DefaultScreen } from './DefaultScreen';

export function ProcessingScreen() {
  return (
    <DefaultScreen className='py-0'>
      <div className='bg-popup-border flex size-[120px] items-center justify-center rounded-full text-white'>
        <DownloadIcon />
      </div>
    </DefaultScreen>
  );
}
