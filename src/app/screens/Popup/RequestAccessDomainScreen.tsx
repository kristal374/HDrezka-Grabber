import { useCallback, useContext } from 'react';
import { Menu } from '../../../components/Menu';
import { PopupInitialDataContext } from '../../../html/popup';

export function RequestAccessDomainScreen() {
  const { siteUrl } = useContext(PopupInitialDataContext)!;

  const requestPermission = useCallback(async () => {
    const permissionData = {
      origins: [`*://${new URL(siteUrl).host}/*`],
    };
    browser.permissions.request(permissionData).then();
    window.close();
  }, []);

  return (
    <div
      className={
        'relative flex grow flex-col items-center justify-center gap-1 px-12 py-6 text-balance'
      }
    >
      <p className='text-center text-base'>
        Расширению требуется доступ для корректной работы на сайте
      </p>
      <button
        className='bg-link-color rounded-md px-4 py-2 text-white'
        onClick={requestPermission}
      >
        Предоставить доступ
      </button>
      <Menu />
    </div>
  );
}
