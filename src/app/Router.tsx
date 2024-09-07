import { useTabID, usePageType } from './providers/CurrentTabProvider';
import { DefaultScreen } from './DefaultScreen';
import { Link } from '../components/Link';
import { DownloadScreen } from './DownloadScreen';

export function Router() {
  const tabID = useTabID();
  const pageType = usePageType();
  if (!!tabID && pageType) {
    if (pageType === 'FILM' || pageType === 'SERIAL') {
      return <DownloadScreen pageType={pageType} />;
    }
    switch (pageType) {
      case 'TRAILER':
        return (
          <DefaultScreen>
            {browser.i18n.getMessage('popup_stub_trailer')}
          </DefaultScreen>
        );
      case 'LOCATION_FILM':
        return (
          <DefaultScreen vpnNotice>
            {browser.i18n.getMessage('popup_stub_locationFilm')}
          </DefaultScreen>
        );
      case 'LOCATION_SERIAL':
        return (
          <DefaultScreen vpnNotice>
            {browser.i18n.getMessage('popup_stub_locationSerial')}
          </DefaultScreen>
        );
      case 'UNAVAILABLE':
        return (
          <DefaultScreen>
            {browser.i18n.getMessage('popup_stub_unvalible')}
          </DefaultScreen>
        );
      case 'ERROR':
        return (
          <DefaultScreen>
            {browser.i18n.getMessage('popup_stub_error')}
          </DefaultScreen>
        );
    }
  }
  return (
    <DefaultScreen>
      {browser.i18n.getMessage('popup_stub_default')}{' '}
      <Link href='https://hdrezka.ag'>HDrezka.ag</Link>!
    </DefaultScreen>
  );
}
