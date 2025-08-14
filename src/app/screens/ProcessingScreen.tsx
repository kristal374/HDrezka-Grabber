import { DownloadIcon } from '../../components/Icons';
import { DefaultScreen } from './DefaultScreen';

export function ProcessingScreen() {
  return (
    <DefaultScreen className='py-0'>
      {/* <LoadAnimation size={128} fill={'white'}></LoadAnimation> */}
      <div className='flex size-[120px] items-center justify-center rounded-full bg-popup-border text-white'>
        <DownloadIcon />
      </div>
    </DefaultScreen>
  );
}
