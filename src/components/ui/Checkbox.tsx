import { cn } from '@/lib/utils';
import {
  Checkbox as CheckboxPrimitive,
  type CheckboxRootProps,
} from '@base-ui/react/checkbox';
import { useId } from 'react';

function Checkbox({ className, ...props }: CheckboxRootProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer focus-ring size-5 shrink-0 cursor-pointer rounded border-[0.125rem] text-lg leading-none font-bold',
        'border-check-box bg-background not-aria-disabled:hover:border-check-box-active not-aria-disabled:hover:bg-input',
        'data-checked:bg-check-box data-checked:text-background not-aria-disabled:hover:data-checked:bg-check-box-active',
        'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className='flex items-center justify-center text-current select-none'>
        ✓
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

interface CheckboxWithLabelProps extends CheckboxRootProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  className?: string;
  children: React.ReactNode;
}

function CheckboxWithLabel({
  id: idProp,
  className,
  children,
  ...props
}: CheckboxWithLabelProps) {
  const genId = useId();
  const id = idProp ?? genId;
  return (
    <label
      htmlFor={id}
      className={cn('flex w-fit items-center gap-2.5', className)}
    >
      <Checkbox id={id} {...props} />
      <span className='text-base font-bold select-none'>{children}</span>
    </label>
  );
}

export { Checkbox, CheckboxWithLabel };
