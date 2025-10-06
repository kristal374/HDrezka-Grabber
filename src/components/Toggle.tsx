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
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out outline-none',
        'ring-link-color ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2',
        checked ? 'bg-link-color' : 'bg-settings-border-secondary',
        disabled && 'cursor-not-allowed opacity-50',
      )}
      role='switch'
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
    >
      <span
        className={cn(
          'pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
});
