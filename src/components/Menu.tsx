import { SlidersHorizontal, SquareKanban, SquareTerminal } from 'lucide-react';
import { cn } from '../lib/utils';
import { MenuButton } from './MenuButton';

interface MenuProps {
  className?: string;
}

export function Menu({ className }: MenuProps) {
  return (
    <div
      className={cn('absolute right-0 top-0 flex flex-col gap-1', className)}
    >
      <MenuButton href='/settings' openInNewTab={true}>
        <SlidersHorizontal size={32} strokeWidth={1.5} />
      </MenuButton>
      <MenuButton href='/loadManager'>
        <SquareKanban size={32} strokeWidth={1.5} className='rotate-[270deg]' />
      </MenuButton>
      <MenuButton href='/loadManager'>
        <SquareTerminal size={32} strokeWidth={1.5} />
      </MenuButton>
    </div>
  );
}
