import { useContext } from 'react';
import { OutsideLink } from '../../../components/OutsideLink';
import { PopupInitialDataContext } from '../../../html/popup';
import { PageType } from '../../../lib/types';
import { DefaultScreen } from './DefaultScreen';
import { DownloadScreen } from './DownloadScreen/DownloadScreen';

export function Router() {
  const initData = useContext(PopupInitialDataContext);

  if (!initData) {
    return (
      <DefaultScreen vpnNotice={false}>
        {browser.i18n.getMessage('popup_stub_default')}{' '}
        <OutsideLink url={'https://hdrezka.ag'} text={'HDrezka.ag'} />!
      </DefaultScreen>
    );
  }
  const { pageType } = initData;

  logger.debug('Page type defined:', pageType);
  if (pageType === 'FILM' || pageType === 'SERIAL') {
    return <DownloadScreen />;
  }

  const isLocationProblem =
    pageType === 'LOCATION_FILM' || pageType === 'LOCATION_SERIAL';
  const messages = {
    TRAILER: browser.i18n.getMessage('popup_stub_trailer'),
    LOCATION_FILM: browser.i18n.getMessage('popup_stub_locationFilm'),
    LOCATION_SERIAL: browser.i18n.getMessage('popup_stub_locationSerial'),
    UNAVAILABLE: browser.i18n.getMessage('popup_stub_unavailable'),
    ERROR: browser.i18n.getMessage('popup_stub_error'),
    DEFAULT: (
      <>
        {browser.i18n.getMessage('popup_stub_default')}{' '}
        <OutsideLink url={'https://hdrezka.ag'} text={'HDrezka.ag'} />!
      </>
    ),
  } satisfies Record<
    Exclude<PageType, 'FILM' | 'SERIAL'>,
    string | React.ReactNode
  >;

  return (
    <DefaultScreen vpnNotice={isLocationProblem}>
      {messages[pageType]}
    </DefaultScreen>
  );
}
