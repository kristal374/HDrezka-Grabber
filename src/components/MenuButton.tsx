type Props = {
  /**
   * Path to html file without .html extension
   */
  href: `/${string}`;
} & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'className'
>;

export function MenuButton({ href, ...props }: Props) {
  return (
    <button
      className='rounded-md p-0.5 transition-colors hover:bg-popup-border'
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
