import { cn } from '@/lib/utils';
import { ChevronDownIcon } from 'lucide-react';
import { type JSX, useCallback, useEffect, useMemo, useState } from 'react';
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
   * Width of button and min width of combobox content in pixels
   */
  width?: number;
  /**
   * Max height of combobox content in pixels
   */
  height?: number;
  data: Array<{
    value: string;
    label: string;
    labelComponent?: (props: React.PropsWithChildren) => JSX.Element;
  }>;
  value?: string;
  onValueChange?: (value: string) => void;
  needSearch?: boolean;
  showChevron?: boolean;
}

export function Combobox({
  id,
  className,
  width = 225,
  height = 185,
  data,
  value: defaultValue = '',
  onValueChange,
  needSearch = true,
  showChevron,
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
          search: (item.label || item.labelComponent || item.value)
            .toString()
            .toLowerCase(),
        },
      ]),
    );
  }, [data]);
  const labelRender = useCallback(
    (lookup: string, children: React.ReactNode) => {
      return dataLookup[lookup]?.labelComponent?.({ children }) ?? children;
    },
    [data],
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          role='combobox'
          aria-expanded={open}
          className={cn(
            'focus-ring flex cursor-pointer items-center rounded-md border-2 px-2 py-1.5 text-sm',
            'border-input bg-background not-disabled:hover:border-input-active not-disabled:hover:bg-input',
            'placeholder:text-foreground-disabled disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          style={{ width }}
        >
          {value
            ? labelRender(
                value,
                <span className='line-clamp-1 text-left'>
                  {dataLookup[value]?.label}
                </span>,
              )
            : browser.i18n.getMessage('combobox_placeholder')}
          {showChevron && (
            <ChevronDownIcon className='ml-auto size-4 shrink-0 opacity-50' />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className='overflow-y-auto'
        style={{ minWidth: width, maxHeight: height }}
      >
        <Command
          filter={(value, search) =>
            dataLookup[value]?.search.includes(search) ? 1 : 0
          }
          loop
        >
          {data.length > 12 && needSearch && (
            <CommandInput
              placeholder={browser.i18n.getMessage('combobox_search')}
              // 8 - scrollbar, 16 - search icon, 10 - left margin, 8 - right margin
              style={{ width: width - 8 - 16 - 10 - 8 }}
            />
          )}
          <CommandList>
            <CommandEmpty>
              {browser.i18n.getMessage('combobox_empty')}
            </CommandEmpty>
            <CommandGroup>
              {data.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue);
                    setOpen(false);
                    onValueChange?.(currentValue);
                  }}
                  className={cn(value === item.value && 'bg-input-active')}
                >
                  {/* <CheckIcon
                    className={cn(
                      'mr-2 size-4',
                      value !== item.value && 'invisible',
                    )}
                  /> */}
                  {labelRender(item.value, item.label)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
