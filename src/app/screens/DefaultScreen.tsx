import { Menu } from '../../components/Menu';

type Props = {
  vpnNotice?: boolean;
} & React.PropsWithChildren;

export function DefaultScreen({ vpnNotice, children }: Props) {
  return (
    <div className='relative flex grow flex-col items-center justify-center gap-1 text-balance px-12 py-6'>
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
