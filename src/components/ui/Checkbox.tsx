import { cn } from '@/lib/utils';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer focus-ring size-5 shrink-0 cursor-pointer rounded border-[0.125rem] text-lg leading-none font-bold',
        'border-check-box bg-background not-disabled:hover:border-check-box-active not-disabled:hover:bg-input',
        'data-checked:bg-check-box data-checked:text-background not-disabled:hover:data-checked:bg-check-box-active',
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
    <label htmlFor={id} className={cn('flex items-center gap-2.5', className)}>
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <span className='text-base font-bold select-none'>{children}</span>
    </label>
  );
}

export { Checkbox, CheckboxWithLabel };
