import { cn } from '@/lib/utils';
import { Collapsible } from '@base-ui/react/collapsible';

const Reveal = Collapsible.Root;

function RevealTrigger({
  children,
  ...props
}: React.ComponentProps<typeof Collapsible.Trigger>) {
  return (
    <Collapsible.Trigger
      // @ts-ignore
      render={children}
      {...props}
    />
  );
}

function RevealContent({
  className,
  ...props
}: React.ComponentProps<typeof Collapsible.Panel>) {
  return (
    <Collapsible.Panel
      className={cn(
        'h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-300 data-[ending-style]:h-0 data-[starting-style]:h-0',
        className,
      )}
      {...props}
    />
  );
}

export { Reveal, RevealContent, RevealTrigger };
