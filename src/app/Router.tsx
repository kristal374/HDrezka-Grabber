import { useTabID } from './providers/CurrentTabProvider';
import { DefaultScreen } from './screens/DefaultScreen';
import { DownloadScreen } from './screens/DownloadScreen/DownloadScreen';
import { usePageType } from './hooks/usePageType';
import { Loader2 } from 'lucide-react';

export function Router() {
  const tabID = useTabID();
  const pageType = usePageType();

  if (!!tabID && pageType) {
    console.log(pageType);
    if (['FILM', 'SERIAL'].includes(pageType)) {
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
    };
    return (
      <DefaultScreen
        vpnNotice={['LOCATION_FILM', 'LOCATION_SERIAL'].includes(pageType)}
      >
        {messages[pageType]}
      </DefaultScreen>
    );
  }

  return (
    <DefaultScreen>
      <Loader2 size={32} className='animate-spin' />
    </DefaultScreen>
  );
}