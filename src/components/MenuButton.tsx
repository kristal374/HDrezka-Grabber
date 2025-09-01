interface MenuButtonProps
  extends Omit<React.ComponentProps<'button'>, 'onClick' | 'className'> {
  /**
   * Path to html file without .html extension
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
    <button
      className='hover:bg-input rounded-md p-1 transition-colors'
      onClick={() => {
        openInNewTab
          ? window.open(browser.runtime.getURL(`${href}.html`))
          : browser.windows.create({
              url: browser.runtime.getURL(`${href}.html`),
              type: 'popup',
              width: 800,
              height: 600,
            });
      }}
      {...props}
    />
  );
}
