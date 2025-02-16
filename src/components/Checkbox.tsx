import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cn } from '../lib/utils';

function Checkbox({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'hover:border-check-box-active hover:data-[state=checked]:bg-check-box-active border-check-box hover:bg-input data-[state=checked]:bg-check-box data-[state=checked]:text-background',
        'peer size-5 shrink-0 rounded border-2 text-lg font-bold leading-[1.05]',
        'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link-color focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className='flex items-center justify-center text-current'>
        {/* <CheckIcon className='size-4' strokeWidth={3} /> */}✓
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
