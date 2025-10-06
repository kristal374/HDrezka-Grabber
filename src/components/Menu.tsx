import { HeroiconsCogIcon } from '@/components/icons/HeroiconsCogIcon';
import { MenuButton } from '@/components/MenuButton';
import { cn } from '@/lib/utils';
import { SquareTerminalIcon } from 'lucide-react';

interface MenuProps {
  className?: string;
}

export function Menu({ className }: MenuProps) {
  return (
    <div
      className={cn('absolute top-0 right-0 flex flex-col gap-1', className)}
    >
      <MenuButton href='/settings' openInNewTab={true}>
        {/* <SlidersHorizontalIcon className='size-8' strokeWidth={1.5} /> */}
        <HeroiconsCogIcon
          className='size-8 transition-transform hover:rotate-45'
          strokeWidth={1.5}
        />
      </MenuButton>
      {/* <MenuButton href='/loadManager'>
        <SquareKanbanIcon className='size-8 rotate-270' strokeWidth={1.5}  />
      </MenuButton> */}
      {settings.enableLogger && (
        <MenuButton href='/logger'>
          <SquareTerminalIcon className='size-8' strokeWidth={1.5} />
        </MenuButton>
      )}
    </div>
  );
}
