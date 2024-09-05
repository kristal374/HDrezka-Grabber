import { cn } from '../lib/utils';

type Props = {
  href: `https://${string}`;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>;

export function Link({ href, className, children, ...props }: Props) {
  return (
    <button
      className={cn(
        'font-bold text-link-color underline underline-offset-4',
        className,
      )}
      onClick={() => {
        browser.tabs.create({ url: href });
      }}
      {...props}
    >
      {children}
    </button>
  );
}
