import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '../lib/utils';
import { Command, CommandGroup, CommandItem, CommandList } from './Command';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

type Props = {
  id?: string;
  data: Array<{ value: string; label: React.ReactNode }>;
  value?: string;
  onValueChange?: (v: string) => void;
};

export function Combobox({
  id,
  data,
  value: defaultValue = '',
  onValueChange,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          role='combobox'
          aria-expanded={open}
          className={cn(
            'w-[225px]',
            'border-input bg-background ring-offset-background placeholder:text-foreground-disabled hover:bg-input focus:ring-link-color',
            'rounded-md border-2 px-2 py-1.5 text-sm',
            'flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
          )}
        >
          {value
            ? data.find((item) => item.value === value)?.label
            : 'Select value...'}
          <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </button>
      </PopoverTrigger>
      <PopoverContent className='w-[225px] p-0'>
        <Command>
          <CommandList>
            <CommandGroup>
              {data.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={(currentValue) => {
                    // setValue(currentValue === value ? '' : currentValue);
                    setValue(currentValue);
                    setOpen(false);
                    onValueChange?.(currentValue);
                  }}
                >
                  {/* <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === item.value ? 'opacity-100' : 'opacity-0',
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
