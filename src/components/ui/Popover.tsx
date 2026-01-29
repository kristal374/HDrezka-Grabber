import { cn } from '@/lib/utils';
import {
  PopoverPositionerProps,
  Popover as PopoverPrimitive,
  PopoverTriggerProps,
} from '@base-ui/react/popover';

const Popover = PopoverPrimitive.Root;

function PopoverTrigger({
  children,
  ...props
}: PopoverTriggerProps & { children: React.ReactElement }) {
  return <PopoverPrimitive.Trigger render={children} {...props} />;
}

function PopoverContent({
  align = 'center',
  side = 'top',
  sideOffset = 4,
  className,
  children,
  ...props
}: PopoverPositionerProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        {...props}
      >
        <PopoverPrimitive.Popup
          className={cn(
            'scroll-container bg-input text-foreground',
            'border-input-active z-50 rounded-md border shadow-md outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
            className,
          )}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
