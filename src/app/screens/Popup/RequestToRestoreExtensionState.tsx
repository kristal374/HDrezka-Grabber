import { Menu } from '@/components/Menu';
import { Button } from '@/components/ui/Button';
import { Message } from '@/lib/types';
import { useCallback, useRef } from 'react';

export function RequestToRestoreExtensionState() {
  const buttonIsPressedRef = useRef(false);

  const requestToRestoreState = useCallback(async (value: boolean) => {
    if (buttonIsPressedRef.current) return;
    buttonIsPressedRef.current = true;

    browser.runtime
      .sendMessage<Message<boolean>>({
        type: 'requestToRestoreState',
        message: value,
      })
      .then();
    window.close();
  }, []);

  return (
    <div className='relative flex grow flex-col items-center justify-center gap-5 px-12 py-6 text-balance'>
      <p className='text-center text-base'>
        {browser.i18n.getMessage('popup_requestToRestore')}
      </p>

      <div className='flex gap-4'>
        <Button
          className='bg-background w-[6.9rem] justify-center'
          variant='outline'
          onClick={() => requestToRestoreState(false)}
        >
          {browser.i18n.getMessage('popup_cancelRestore')}
        </Button>
        <Button
          variant='primary'
          className='w-[6.9rem] justify-center'
          onClick={() => requestToRestoreState(true)}
        >
          {browser.i18n.getMessage('popup_applyRestore')}
        </Button>
      </div>

      <Menu />
    </div>
  );
}
