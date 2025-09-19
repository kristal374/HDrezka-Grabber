import { JSX, memo } from 'react';
import { cn } from '../lib/utils';

type SelectProps<T extends string | number> = {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
};

function SelectInner<T extends string | number>({
  value,
  onChange,
  options,
  disabled = false,
}: SelectProps<T>) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        const newValue =
          typeof value === 'number' ? (Number(raw) as T) : (raw as T);
        onChange(newValue);
      }}
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
}

export const Select = memo(SelectInner) as <T extends string | number>(
  props: SelectProps<T>,
) => JSX.Element;
