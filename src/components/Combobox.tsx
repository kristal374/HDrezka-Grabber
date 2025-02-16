import { useEffect, useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './Command';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

interface ComboboxProps {
  id?: string;
  className?: string;
  /**
   * Width in pixels
   */
  width?: number;
  data: Array<{ value: string; label: React.ReactNode }>;
  value?: string;
  onValueChange?: (value: string, label: string) => void;
}

export function Combobox({
  id,
  className,
  width = 225,
  data,
  value: defaultValue = '',
  onValueChange,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);
  const dataLookup = useMemo(() => {
    return Object.fromEntries(
      data.map((item) => [
        item.value,
        {
          ...item,
          search: (item.label || item.value).toString().toLowerCase(),
        },
      ]),
    );
  }, [data]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          role='combobox'
          aria-expanded={open}
          className={cn(
            'hover:border-input-active border-input bg-background hover:bg-input',
            'flex items-center justify-between rounded-md border-2 px-2 py-1.5 text-sm [&>span]:line-clamp-1',
            'placeholder:text-foreground-disabled disabled:cursor-not-allowed disabled:opacity-50',
            'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link-color focus-visible:ring-offset-2',
            className,
          )}
          style={{ width }}
        >
          {value ? dataLookup[value]?.label : 'Select value...'}
          {/* <ChevronDown className='ml-2 size-4 shrink-0 opacity-50' /> */}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className='max-h-[185px] overflow-y-auto'
        style={{ minWidth: width }}
      >
        <Command
          filter={(value, search) =>
            dataLookup[value]?.search.includes(search) ? 1 : 0
          }
        >
          {data.length > 12 && (
            <CommandInput
              placeholder='Search...'
              style={{ width: width - 8 }}
            />
          )}
          <CommandList>
            <CommandEmpty>No results found</CommandEmpty>
            <CommandGroup>
              {data.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue);
                    setOpen(false);
                    onValueChange?.(currentValue, item.label as string);
                  }}
                  className={cn(value === item.value && 'bg-input-active')}
                >
                  {/* <CheckIcon
                    className={cn(
                      'mr-2 size-4',
                      value !== item.value && 'invisible',
                    )}
                  /> */}
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
