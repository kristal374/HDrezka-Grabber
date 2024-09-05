import { SlidersHorizontal, SquareKanban, SquareTerminal } from 'lucide-react';
import { MenuButton } from './MenuButton';
import { cn } from '../lib/utils';

type Props = {
  className?: string;
};

export function Menu({ className }: Props) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <MenuButton href='/settings'>
        <SlidersHorizontal size={28} strokeWidth={1.5} />
      </MenuButton>
      <MenuButton href='/loadManager'>
        <SquareKanban
          size={28}
          strokeWidth={1.5}
          className='rotate-[270deg]'
        />
      </MenuButton>
      <MenuButton href='/logger'>
        <SquareTerminal size={28} strokeWidth={1.5} />
      </MenuButton>
    </div>
  );
}
