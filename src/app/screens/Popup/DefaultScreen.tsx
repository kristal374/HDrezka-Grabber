import { Menu } from '@/components/Menu';
import { cn } from '@/lib/utils';

type Props = {
  vpnNotice?: boolean;
  className?: string;
} & React.PropsWithChildren;

export function DefaultScreen({ vpnNotice, className, children }: Props) {
  return (
    <div
      className={cn(
        'relative flex grow flex-col items-center justify-center gap-1 px-12 py-6 text-balance',
        className,
      )}
    >
      <div className='text-center text-base'>{children}</div>
      {vpnNotice && (
        <p className='text-center text-base'>
          {browser.i18n.getMessage('popup_stub_vpn')}
        </p>
      )}
      <Menu />
    </div>
  );
}
