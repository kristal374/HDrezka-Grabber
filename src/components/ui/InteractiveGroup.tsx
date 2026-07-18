import { cn } from '@/lib/utils';

interface InteractiveGroupProps extends React.ComponentProps<'div'> {
  orientation?: 'horizontal' | 'vertical';
}

function InteractiveGroup({
  orientation = 'horizontal',
  className,
  ...props
}: InteractiveGroupProps) {
  return (
    <div
      className={cn(
        'flex *:relative *:isolate *:focus-within:z-1',
        '*:data-interactive:not-first-of-type:not-last-of-type:rounded-none',
        orientation === 'horizontal' && [
          '*:data-interactive:first-of-type:not-last:rounded-r-none',
          '*:data-interactive:last-of-type:not-first:rounded-l-none',
        ],
        orientation === 'vertical' && [
          'flex-col',
          '*:data-interactive:first-of-type:not-last:rounded-b-none',
          '*:data-interactive:last-of-type:not-first:rounded-t-none',
        ],
        className,
      )}
      data-orientation={orientation}
      data-interactive
      {...props}
    />
  );
}

function InteractiveGroupSeparator({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-border',
        'in-data-[orientation="horizontal"]:h-full in-data-[orientation="horizontal"]:w-px',
        'in-data-[orientation="vertical"]:h-px in-data-[orientation="vertical"]:w-full',
        className,
      )}
    />
  );
}

export { InteractiveGroup, InteractiveGroupSeparator };
