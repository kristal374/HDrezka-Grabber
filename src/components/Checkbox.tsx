import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cn } from '../lib/utils';

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'border-check-box hover:border-check-box-active hover:bg-input data-[state=checked]:bg-check-box data-[state=checked]:text-background hover:data-[state=checked]:bg-check-box-active',
        'peer size-5 shrink-0 rounded border-2 text-lg leading-[1.05] font-bold',
        'ring-offset-background focus-visible:ring-link-color focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className='flex items-center justify-center text-current'>
        ✓
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

type CheckboxWithLabelProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  className?: string;
  children: React.ReactNode;
};

function CheckboxWithLabel({
  id,
  checked,
  onCheckedChange,
  className,
  children,
}: CheckboxWithLabelProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <label htmlFor={id} className='text-base font-bold select-none'>
        {children}
      </label>
    </div>
  );
}

export { Checkbox, CheckboxWithLabel };
