import { Menu } from '../../components/Menu';
import { cn } from '../../lib/utils';

type Props = {
  vpnNotice?: boolean;
  className?: string;
} & React.PropsWithChildren;

export function DefaultScreen({ vpnNotice, className, children }: Props) {
  return (
    <div
      className={cn(
        'relative flex grow flex-col items-center justify-center gap-1 text-balance px-12 py-6',
        className,
      )}
    >
      <p className='text-center text-base'>{children}</p>
      {vpnNotice && (
        <p className='text-center text-base'>
          {browser.i18n.getMessage('popup_stub_vpn')}
        </p>
      )}
      <Menu />
    </div>
  );
}
