import { useTabID } from './providers/CurrentTabProvider';
import { DefaultScreen } from './screens/DefaultScreen';
import { DownloadScreen } from './screens/DownloadScreen/DownloadScreen';
import { usePageType } from './hooks/usePageType';
import { Loader2 } from 'lucide-react';
import { PageType } from '../lib/types';

export function Router() {
  const tabID = useTabID();
  const pageType = usePageType();

  if (!!tabID && pageType) {
    console.log(pageType);
    if (pageType === 'FILM' || pageType === 'SERIAL') {
      return <DownloadScreen pageType={pageType} />;
    }
    const messages = {
      TRAILER: browser.i18n.getMessage('popup_stub_trailer'),
      LOCATION_FILM: browser.i18n.getMessage('popup_stub_locationFilm'),
      LOCATION_SERIAL: browser.i18n.getMessage('popup_stub_locationSerial'),
      UNAVAILABLE: browser.i18n.getMessage('popup_stub_unavailable'),
      ERROR: browser.i18n.getMessage('popup_stub_error'),
      DEFAULT: (
        <>
          {browser.i18n.getMessage('popup_stub_default')}{' '}
          <a
            href='https://hdrezka.ag'
            target='_blank'
            className='font-bold text-link-color underline underline-offset-4'
          >
            HDrezka.ag
          </a>
          !
        </>
      ),
    } satisfies Record<
      Exclude<PageType, 'FILM' | 'SERIAL'>,
      string | React.ReactNode
    >;
    return (
      <DefaultScreen
        vpnNotice={
          pageType === 'LOCATION_FILM' || pageType === 'LOCATION_SERIAL'
        }
      >
        {messages[pageType]}
      </DefaultScreen>
    );
  }

  return (
    <DefaultScreen className='py-12'>
      <Loader2 size={32} className='animate-spin' />
    </DefaultScreen>
  );
}
