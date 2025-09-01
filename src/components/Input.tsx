import { memo } from 'react';
import { cn } from '../lib/utils';

export const Input = memo(function Input({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  min,
  max,
}: {
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      className={cn(
        'border-settings-border-secondary bg-settings-background-primary text-settings-text-secondary placeholder-settings-text-tertiary focus:border-link-color focus:ring-link-color block w-full rounded-md border px-3 py-2 shadow-sm focus:ring-1 focus:outline-none sm:text-sm',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    />
  );
});
