import { HeroiconsCogIcon } from '@/components/icons/HeroiconsCogIcon';
import { Button } from '@/components/ui/Button';
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
      <MenuButton href='/settings' openInNewTab={true} title='Настройки'>
        {/* <SlidersHorizontalIcon className='size-8' strokeWidth={1.5} /> */}
        <HeroiconsCogIcon
          className='size-8 transition-transform duration-300 hover:rotate-45'
          strokeWidth={1.5}
        />
      </MenuButton>
      {/* <MenuButton href='/loadManager' title='Диспетчер загрузок'>
        <SquareKanbanIcon className='size-8 rotate-270' strokeWidth={1.5}  />
      </MenuButton> */}
      {settings.enableLogger && (
        <MenuButton href='/logger' title='Журнал событий'>
          <SquareTerminalIcon className='size-8' strokeWidth={1.5} />
        </MenuButton>
      )}
    </div>
  );
}

interface MenuButtonProps
  extends Omit<React.ComponentProps<'button'>, 'onClick' | 'className'> {
  /**
   * Path to an HTML file without .html extension
   */
  href: `/${string}`;
  openInNewTab?: boolean;
}

export function MenuButton({
  href,
  openInNewTab = false,
  ...props
}: MenuButtonProps) {
  return (
    <Button
      variant='ghost'
      size='square'
      onClick={() => {
        openInNewTab
          ? window.open(browser.runtime.getURL(`${href}.html`))
          : browser.windows.create({
              url: browser.runtime.getURL(`${href}.html`),
              type: 'popup',
              width: 800,
              height: 600,
            });
        if (openInNewTab) {
          // Firefox specific
          window.close();
        }
      }}
      {...props}
    />
  );
}
