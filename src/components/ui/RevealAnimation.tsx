import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsiblePanelProps,
  CollapsibleTriggerProps,
} from '@base-ui/react/collapsible';
import { useLayoutEffect, useRef } from 'react';

const Reveal = Collapsible.Root;

function RevealTrigger({
  children,
  ...props
}: CollapsibleTriggerProps & { children: React.ReactElement }) {
  return <Collapsible.Trigger render={children} {...props} />;
}

function RevealContent({ className, ...props }: CollapsiblePanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const elem = ref.current;
    if (!elem) return;
    if (elem.dataset.hasOwnProperty('closed')) {
      elem.classList.add('overflow-hidden');
    }
  }, []);
  return (
    <Collapsible.Panel
      {...props}
      className={cn(
        'h-(--collapsible-panel-height) transition-[height] duration-300',
        'data-ending-style:h-0 data-ending-style:overflow-hidden data-starting-style:h-0',
        className,
      )}
      ref={ref}
      keepMounted={true}
      onTransitionEnd={() => {
        const elem = ref.current;
        if (!elem) return;
        if (elem.dataset.hasOwnProperty('open')) {
          elem.classList.remove('overflow-hidden');
        } else if (elem.dataset.hasOwnProperty('closed')) {
          elem.classList.add('overflow-hidden');
        }
      }}
    />
  );
}

export { Reveal, RevealContent, RevealTrigger };
