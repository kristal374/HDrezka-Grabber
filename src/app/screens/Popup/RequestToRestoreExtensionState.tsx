import { Menu } from '@/components/Menu';
import { Button } from '@/components/ui/Button';
import { Message } from '@/lib/types';
import { useCallback } from 'react';

export function RequestToRestoreExtensionState() {
  const requestToRestoreState = useCallback(async (value: boolean) => {
    await browser.runtime.sendMessage<Message<boolean>>({
      type: 'requestToRestoreState',
      message: value,
    });
    window.close();
  }, []);

  return (
    <div className='relative flex grow flex-col items-center justify-center gap-5 px-12 py-6 text-balance'>
      <p className='text-center text-base'>
        Работа расширения была прервана. Возобновить загрузку?
      </p>

      <div className='flex gap-4'>
        <Button
          className='bg-background w-[6.9rem] justify-center'
          variant='outline'
          onClick={() => requestToRestoreState(false)}
        >
          Отменить
        </Button>
        <Button
          variant='primary'
          className='w-[6.9rem] justify-center'
          onClick={() => requestToRestoreState(true)}
        >
          Возобновить
        </Button>
      </div>

      <Menu />
    </div>
  );
}
