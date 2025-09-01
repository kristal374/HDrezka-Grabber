import { memo } from 'react';
import { cn } from '../lib/utils';

export const Select = memo(function Select({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'border-settings-border-secondary bg-settings-background-primary text-settings-text-secondary focus:border-link-color focus:ring-link-color block w-full rounded-md border px-3 py-2 shadow-sm focus:ring-1 focus:outline-none sm:text-sm',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});
