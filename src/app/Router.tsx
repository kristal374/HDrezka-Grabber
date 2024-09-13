import { useTabID } from './providers/CurrentTabProvider';
import { DefaultScreen } from './DefaultScreen';
import { DownloadScreen } from './DownloadScreen';
import { usePageType } from './hooks/usePageType';
import { Loader2 } from 'lucide-react';

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
      case 'DEFAULT':
        return (
          <DefaultScreen>
            {browser.i18n.getMessage('popup_stub_default')}{' '}
            <a
              href='https://hdrezka.ag'
              target='_blank'
              className='font-bold text-link-color underline underline-offset-4'
            >
              HDrezka.ag
            </a>
            !
          </DefaultScreen>
        );
    }
  }
  return (
    <DefaultScreen>
      <Loader2 size={32} className='animate-spin' />
    </DefaultScreen>
  );
}
