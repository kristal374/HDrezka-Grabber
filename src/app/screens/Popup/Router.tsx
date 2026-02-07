import { RequestToRestoreExtensionState } from '@/app/screens/Popup/RequestToRestoreExtensionState';
import { OutsideLink } from '@/components/ui/OutsideLink';
import { PopupInitialDataContext } from '@/html/popup';
import { PageType } from '@/lib/types';
import { useContext } from 'react';
import { DefaultScreen } from './DefaultScreen';
import { DownloadScreen } from './DownloadScreen/DownloadScreen';

export function Router() {
  const { pageType, needToRestoreInsideState } = useContext(
    PopupInitialDataContext,
  )!;

  if (needToRestoreInsideState) {
    logger.debug('Need to restore extension state.');
    return <RequestToRestoreExtensionState />;
  }

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
    SPLIT_VIEW: browser.i18n.getMessage('popup_stub_splitView'),
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
