import { cn } from '@/lib/utils';

interface VariantProps {
  size?: 'default' | 'square' | 'square-large';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'dangerous';
}

function buttonVariants(
  { size = 'default', variant = 'primary' }: VariantProps,
  className?: string,
) {
  return cn(
    'group focus-ring flex cursor-pointer items-center gap-2 rounded-md text-sm font-medium select-none',
    'transition-transform duration-200 not-disabled:active:scale-97',
    'disabled:cursor-not-allowed disabled:opacity-50',
    size === 'default' && 'px-3 pt-1.25 pb-1.5',
    size === 'square' && 'p-1',
    size === 'square-large' && 'px-2.5 py-2.25',
    (size === 'square' || size === 'square-large') &&
      'not-disabled:active:scale-95',
    variant === 'primary' &&
      'bg-link-color not-disabled:hover:bg-link-color/75 text-white',
    variant === 'secondary' &&
      'bg-input-active not-disabled:hover:bg-settings-border-primary in-[.bg-settings-border-primary]:not-disabled:hover:bg-background',
    variant === 'outline' &&
      'border-settings-border-primary bg-settings-background-secondary text-settings-text-primary not-disabled:hover:bg-input focus-visible:bg-input border',
    variant === 'ghost' && 'not-disabled:hover:bg-input focus-visible:bg-input',
    variant === 'dangerous' &&
      'not-light:not-disabled:hover:text-red-200 not-light:focus-visible:text-red-200 bg-red-500/15 text-red-500 not-disabled:hover:bg-red-500/40 focus-visible:bg-red-500/40',
    className,
  );
}

interface ButtonProps extends React.ComponentProps<'button'>, VariantProps {}

function Button({
  size = 'default',
  variant = 'primary',
  title,
  'aria-label': ariaLabel,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonVariants({ size, variant }, className)}
      type='button'
      title={title}
      aria-label={ariaLabel ?? title}
      data-interactive
      {...props}
    />
  );
}

interface LinkButtonProps extends React.ComponentProps<'a'>, VariantProps {}

function LinkButton({
  size = 'default',
  variant = 'primary',
  title,
  'aria-label': ariaLabel,
  className,
  ...props
}: LinkButtonProps) {
  return (
    <a
      className={buttonVariants({ size, variant }, className)}
      title={title}
      aria-label={ariaLabel ?? title}
      data-interactive
      target='_blank'
      {...props}
    />
  );
}

export { Button, LinkButton };
export type { ButtonProps, LinkButtonProps };
