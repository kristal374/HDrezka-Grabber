import { useTabID, usePageType } from './providers/CurrentTabProvider';
import { DefaultPage } from './DefaultPage';
import { Link } from '../components/Link';

export function Router() {
  const tabID = useTabID();
  const pageType = usePageType();
  if (!!tabID && pageType) {
    if (pageType === "FILM" || pageType === "SERIAL") return
    switch (pageType) {
      case 'TRAILER':
        return (
          <DefaultPage>
            <h2 className='text-center text-base'>
              {browser.i18n.getMessage('popup_stub_trailer')}
            </h2>
          </DefaultPage>
        );
      case 'LOCATION_FILM':
        return (
          <DefaultPage>
            <h2 className='text-center text-base'>
              {browser.i18n.getMessage('popup_stub_locationFilm')}
            </h2>
            <h2 className='text-center text-base'>
              {browser.i18n.getMessage('popup_stub_vpn')}
            </h2>
          </DefaultPage>
        );
      case 'LOCATION_SERIAL':
        return (
          <DefaultPage>
            <h2 className='text-center text-base'>
              {browser.i18n.getMessage('popup_stub_locationSerial')}
            </h2>
            <h2 className='text-center text-base'>
              {browser.i18n.getMessage('popup_stub_vpn')}
            </h2>
          </DefaultPage>
        );
      case 'UNAVAILABLE':
        return (
          <DefaultPage>
            <h2 className='text-center text-base'>
              {browser.i18n.getMessage('popup_stub_unvalible')}
            </h2>
          </DefaultPage>
        );
      case 'ERROR':
        return (
          <DefaultPage>
            <h2 className='text-center text-base'>
              {browser.i18n.getMessage('popup_stub_error')}
            </h2>
          </DefaultPage>
        );
    }
  }
  return (
    <DefaultPage>
      <h2 className='text-center text-base'>
        {browser.i18n.getMessage('popup_stub_default')}{' '}
        <Link href='https://hdrezka.ag'>HDrezka.ag</Link>!
      </h2>
    </DefaultPage>
  );
}

