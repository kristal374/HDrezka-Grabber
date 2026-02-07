import { cn } from '@/lib/utils';

export function SplitElement({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex *:relative *:isolate *:focus-within:z-1',
        '*:interactive:first-of-type:not-last:rounded-r-none',
        '*:interactive:last-of-type:not-first:rounded-l-none',
        '*:interactive:not-first-of-type:not-last-of-type:rounded-none',
        className,
      )}
      {...props}
    />
  );
}
