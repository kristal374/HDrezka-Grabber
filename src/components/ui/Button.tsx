import { cn } from '@/lib/utils';

interface ButtonProps extends React.ComponentProps<'button'> {
  size?: 'default' | 'square';
  variant?: 'primary' | 'outline' | 'ghost' | 'dangerous';
}

export function Button({
  size = 'default',
  variant = 'primary',
  title,
  'aria-label': ariaLabel,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'group focus-ring flex cursor-pointer items-center gap-2 rounded-md text-sm font-medium select-none',
        'transition-transform duration-200 not-disabled:active:scale-97',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'default' && 'px-3 pt-1.25 pb-1.5',
        size === 'square' && 'p-1',
        variant === 'primary' &&
          'bg-link-color not-disabled:hover:bg-link-color/75 text-white',
        variant === 'outline' &&
          'border-settings-border-primary bg-settings-background-secondary text-settings-text-primary not-disabled:hover:bg-input focus-visible:bg-input border',
        variant === 'ghost' &&
          'not-disabled:hover:bg-input focus-visible:bg-input',
        variant === 'dangerous' &&
          'text-settings-text-tertiary not-disabled:hover:bg-red-500/10 not-disabled:hover:text-red-400 focus-visible:bg-red-500/10 focus-visible:text-red-400',
        className,
      )}
      type='button'
      title={title}
      aria-label={ariaLabel ?? title}
      {...props}
    />
  );
}
