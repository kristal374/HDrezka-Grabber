import { CogIcon } from '@/components/icons/CogIcon';
import { Button, LinkButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { SquareTerminalIcon } from 'lucide-react';
import type { PropsWithChildren } from 'react';

interface MenuProps {
  className?: string;
}

export function Menu({ className }: MenuProps) {
  return (
    <div
      className={cn('absolute top-0 right-0 flex flex-col gap-1', className)}
    >
      <MenuButton
        href='/settings'
        openInNewTab={true}
        title={browser.i18n.getMessage('popup_menu_settings')}
      >
        <CogIcon
          className='size-8 transition-transform duration-300 hover:rotate-45'
          strokeWidth={1.5}
        />
      </MenuButton>
      {/* <MenuButton
        href='/loadManager'
        title={browser.i18n.getMessage('popup_menu_loadManager')}
      >
        <SquareKanbanIcon className='size-8 rotate-270' strokeWidth={1.5}  />
      </MenuButton> */}
      {settings.enableLogger && (
        <MenuButton
          href='/logger'
          title={browser.i18n.getMessage('popup_menu_loggerWindow')}
        >
          <SquareTerminalIcon className='size-8' strokeWidth={1.5} />
        </MenuButton>
      )}
    </div>
  );
}

interface MenuButtonProps extends PropsWithChildren {
  /**
   * Path to an HTML file without .html extension
   */
  href: `/${string}`;
  openInNewTab?: boolean;
  title?: string;
}

export function MenuButton({
  href,
  openInNewTab = false,
  ...props
}: MenuButtonProps) {
  const url = browser.runtime.getURL(`${href}.html`);
  if (openInNewTab) {
    return <LinkButton variant='ghost' size='square' href={url} {...props} />;
  }
  return (
    <Button
      variant='ghost'
      size='square'
      onClick={() => {
        openInNewTab
          ? window.open(url)
          : browser.windows.create({
              url,
              type: 'popup',
              state: 'maximized',
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
