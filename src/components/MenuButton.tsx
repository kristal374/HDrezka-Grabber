interface MenuButtonProps
  extends Omit<React.ComponentProps<'button'>, 'onClick' | 'className'> {
  /**
   * Path to html file without .html extension
   */
  href: `/${string}`;
}

export function MenuButton({ href, ...props }: MenuButtonProps) {
  return (
    <button
      className='rounded-md p-1 transition-colors hover:bg-input'
      onClick={() => {
        browser.windows.create({
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
