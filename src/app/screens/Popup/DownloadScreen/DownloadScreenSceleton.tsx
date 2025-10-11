import { DownloadIcon } from '@/components/icons/DownloadIcon';
import { DefaultScreen } from '../DefaultScreen';

export function DownloadScreenSceleton() {
  return (
    <DefaultScreen className='py-0'>
      <div className='bg-popup-border flex size-30 items-center justify-center rounded-full text-white'>
        <DownloadIcon />
      </div>
    </DefaultScreen>
  );
}
