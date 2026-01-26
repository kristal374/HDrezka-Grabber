import { cn } from '@/lib/utils';

export interface InputProps extends React.ComponentProps<'input'> {}

function Input({
  type,
  name,
  id,
  placeholder,
  className,
  ...props
}: InputProps) {
  return (
    <input
      type={type}
      name={name}
      id={id || name}
      className={cn(
        'bg-background border-input not-disabled:hover:border-input-active not-disabled:hover:bg-input',
        'flex w-full rounded-md border-[0.125rem] px-3 pt-1.25 pb-1.5 text-sm',
        'focus-ring placeholder:text-foreground/70 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      placeholder={placeholder}
      title={placeholder}
      {...props}
    />
  );
}

export { Input };
