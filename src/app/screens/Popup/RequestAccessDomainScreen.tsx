import { Button } from '@/components/Button';
import { Menu } from '@/components/Menu';
import { PopupInitialDataContext } from '@/html/popup';
import { useCallback, useContext } from 'react';

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
    <div className='relative flex grow flex-col items-center justify-center gap-5 px-12 py-6 text-balance'>
      <p className='text-center text-base'>
        Расширению нужно предостовать доступ к этому сайту для работы
      </p>
      <Button onClick={requestPermission}>Предоставить доступ</Button>
      <Menu />
    </div>
  );
}
