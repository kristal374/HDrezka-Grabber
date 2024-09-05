import { useCurrentTab } from './providers/CurrentTabProvider';
import { DefaultPage } from './DefaultPage';
import { Link } from '../components/Link';

export function Router() {
  const { currentTab } = useCurrentTab();
  if (!currentTab.id || !currentTab.isHdrezka) {
    return (
      <DefaultPage>
        <h2 className='text-center text-base'>
          {browser.i18n.getMessage('popup_stub_default')}{' '}
          <Link href='https://hdrezka.ag'>HDrezka.ag</Link>!
        </h2>
      </DefaultPage>
    );
  }
  return (
    <DefaultPage>
      <h2 className='text-center text-base'>
        {browser.i18n.getMessage('popup_stub_trailer')}
      </h2>
      {/* <h2 className='text-center text-base'>
        {browser.i18n.getMessage('popup_stub_vpn')}
      </h2> */}
    </DefaultPage>
  );
}
