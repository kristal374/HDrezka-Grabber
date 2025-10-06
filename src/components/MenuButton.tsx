import { Button } from '@/components/Button';

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
      className='p-1'
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
