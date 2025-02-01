import { PageType } from '../lib/types';
import { useInitData } from './providers/InitialDataProvider';
import { DefaultScreen } from './screens/DefaultScreen';
import { DownloadScreen } from './screens/DownloadScreen/DownloadScreen';

export function Router() {
  const { pageType } = useInitData();

  logger.debug('Page type defined:', pageType);
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
      vpnNotice={pageType === 'LOCATION_FILM' || pageType === 'LOCATION_SERIAL'}
    >
      {messages[pageType]}
    </DefaultScreen>
  );
}
