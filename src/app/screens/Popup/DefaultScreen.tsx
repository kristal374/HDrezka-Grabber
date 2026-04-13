import { Menu } from '@/components/Menu';
import { cn } from '@/lib/utils';
import { GlobeLockIcon } from 'lucide-react';

type Props = {
  vpnNotice?: boolean;
  className?: string;
} & React.PropsWithChildren;

export function DefaultScreen({ vpnNotice, className, children }: Props) {
  return (
    <div
      className={cn(
        'relative flex grow flex-col items-center justify-center gap-3 px-12 py-6 text-balance',
        className,
      )}
    >
      <div className='text-center text-base leading-snug'>{children}</div>
      {vpnNotice && (
        <div className='bg-input light:border-input-active flex items-center gap-1.5 rounded-md px-2 py-1'>
          <GlobeLockIcon className='size-5 shrink-0' />
          <span className='text-sm leading-tight'>
            {browser.i18n.getMessage('popup_stub_vpn')}
          </span>
        </div>
      )}
      <Menu />
    </div>
  );
}
