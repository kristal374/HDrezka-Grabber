import { useEffect, useState } from 'react';
import { Menu } from '../components/Menu';
import type { PageType, Message } from '../lib/types';

type Props = {
  pageType: PageType;
};

export function DownloadScreen({ pageType }: Props) {
  const haveSubtitles = true;
  const [error, setError] = useState<string | null>('Error message');
  useEffect(() => {
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      return true;
    });
  }, []);
  return (
    <div className='flex size-full flex-col gap-5'>
      <div className='relative flex items-center justify-center'>
        <button className='flex size-[120px] cursor-pointer items-center justify-center rounded-full bg-popup-border'>
          <DownloadIcon />
        </button>
        <Menu />
      </div>
      <div className='flex w-full flex-col gap-3'>
        {error && (
          <div className='rounded bg-error px-1.5 py-1'>
            <p className='text-sm'>{error}</p>
          </div>
        )}
        {pageType === 'SERIAL' && (
          <div>
            <p className='text-lg'>Download serial</p>
          </div>
        )}
        {haveSubtitles && (
          <div>
            <p className='text-lg'>Subtitles</p>
            <hr className='w-full border-b border-popup-border' />
          </div>
        )}
        <div>
          <p className='text-lg'>Audio</p>
        </div>
        <div>
          <p className='text-lg'>Quality</p>
        </div>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      width='61'
      height='77'
      viewBox='0 0 61 77'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g clip-path='url(#clip0_334_688)'>
        <path
          d='M42.0324 0H22.0322V34.2434H3.16491L32.0324 56.794L60.8999 34.2434H42.0324V0Z'
          fill='currentColor'
        />
        <path
          d='M58.699 76.839V66.8165H5.36543V76.839H58.699Z'
          fill='currentColor'
        />
      </g>
      <defs>
        <clipPath id='clip0_334_688'>
          <rect
            width='60'
            height='76.8389'
            fill='white'
            transform='matrix(-1 0 0 1 60.8999 0)'
          />
        </clipPath>
      </defs>
    </svg>
  );
}
