import { cn } from '@/lib/utils';
import { memo } from 'react';

export const Toggle = memo(function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type='button'
      className={cn(
        'group focus-ring relative inline-flex w-11.5 flex-shrink-0 cursor-pointer items-center rounded-full p-0.75',
        checked
          ? 'bg-link-color not-disabled:hover:bg-link-color/75'
          : 'bg-input not-disabled:hover:bg-input-active',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
      role='switch'
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
    >
      <span
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
          'group-active:translate-y-0 group-not-disabled:group-active:scale-92',
        )}
      />
    </button>
  );
});
