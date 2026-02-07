import { cn } from '@/lib/utils';
import {
  TooltipPositionerProps,
  Tooltip as TooltipPrimitive,
  TooltipTriggerProps,
} from '@base-ui/react/tooltip';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

function TooltipTrigger({
  children,
  ...props
}: TooltipTriggerProps & { children: React.ReactElement }) {
  return (
    <TooltipPrimitive.Trigger
      style={{ pointerEvents: 'auto' }}
      render={children}
      {...props}
    />
  );
}

function TooltipContent({
  className,
  align = 'center',
  sideOffset = 4,
  children,
  ...props
}: TooltipPositionerProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        sideOffset={sideOffset}
        className='z-100'
        {...props}
      >
        <TooltipPrimitive.Popup
          className={cn(
            'bg-settings-border-primary border-input-active border shadow-md outline-none',
            'w-fit rounded-md px-2 py-1.5 text-xs text-balance',
            'origin-(--transform-origin) transition-[transform,scale,opacity]',
            'data-ending-style:scale-90 data-ending-style:opacity-0 data-instant:transition-none',
            'data-starting-style:scale-90 data-starting-style:opacity-0',
            className,
          )}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
