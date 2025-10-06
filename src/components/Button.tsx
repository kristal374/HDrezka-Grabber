import { cn } from '@/lib/utils';

interface ButtonProps extends React.ComponentProps<'button'> {
  size?: 'default' | 'square';
  variant?: 'primary' | 'outline' | 'ghost' | 'dangerous';
}

export function Button({
  size = 'default',
  variant = 'primary',
  title,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-md text-sm font-medium select-none',
        'ring-link-color ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'transition-transform duration-200 not-disabled:active:scale-97',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'default' && 'px-3 pt-1.25 pb-1.5',
        size === 'square' && 'p-1.5',
        variant === 'primary' &&
          'bg-link-color not-disabled:hover:bg-link-color/75 text-white',
        variant === 'outline' &&
          'border-settings-border-primary bg-settings-background-secondary text-settings-text-primary not-disabled:hover:bg-input border',
        variant === 'ghost' &&
          'not-disabled:hover:bg-input focus-visible:bg-input',
        variant === 'dangerous' &&
          'text-settings-text-tertiary not-disabled:hover:bg-red-500/10 not-disabled:hover:text-red-400',
        className,
      )}
      title={title}
      aria-label={title}
      {...props}
    />
  );
}
