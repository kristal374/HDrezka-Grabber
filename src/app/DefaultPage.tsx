import { Menu } from '../components/Menu';

export function DefaultPage({ children }: React.PropsWithChildren) {
  return (
    <div className='flex size-full flex-col items-center justify-center gap-1 text-balance p-8'>
      {children}
      <Menu className='absolute right-3 top-3' />
    </div>
  );
}
