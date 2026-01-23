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
  itemClassName?: string;
  /**
   * Width of button and min width of combobox content in pixels or rem
   */
  width?: number | string;
  popoverWidth?: number | string;
  /**
   * Max height of combobox content in pixels or rem
   */
  height?: number | string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  data: Array<{
    value: string;
    label: string;
    labelComponent?: (
      props: React.PropsWithChildren<{ isRenderingInPreview: boolean }>,
    ) => JSX.Element;
  }>;
  value?: string;
  onValueChange?: (value: string) => void;
  onValueHover?: (value: string) => void;
  needSearch?: boolean;
  showChevron?: boolean;
  title?: string;
  disabled?: boolean;
}

export function Combobox({
  id,
  className,
  itemClassName,
  width = '14rem', // 224px
  popoverWidth,
  height = '11.5rem', // 184px
  align,
  side,
  data,
  value: defaultValue = '',
  onValueChange,
  onValueHover,
  needSearch = true,
  showChevron,
  title,
  disabled,
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
    (lookup: string, children: React.ReactNode, isPreview: boolean) => {
      return (
        dataLookup[lookup]?.labelComponent?.({
          children,
          isRenderingInPreview: isPreview,
        }) ?? children
      );
    },
    [data],
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <button
          id={id}
          role='combobox'
          aria-expanded={open}
          className={cn(
            'focus-ring flex cursor-pointer items-center rounded-md border-[0.125rem] px-2 py-1.5 text-sm',
            'border-input bg-background not-disabled:hover:border-input-active not-disabled:hover:bg-input',
            'placeholder:text-foreground-disabled disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          style={{ width }}
          title={title}
          disabled={disabled}
        >
          {value
            ? labelRender(
                value,
                <span className='line-clamp-1 text-left'>
                  {dataLookup[value]?.label}
                </span>,
                true,
              )
            : browser.i18n.getMessage('combobox_placeholder')}
          {showChevron && (
            <ChevronDownIcon className='ml-auto size-4 shrink-0 opacity-50' />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className='overflow-y-auto'
        style={{ minWidth: width, maxHeight: height, width: popoverWidth }}
        align={align}
        side={side}
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
              // 0.5rem - scrollbar, 1rem - search icon, 0.625rem - left margin, 0.5rem - right margin
              style={{
                width: `calc(${width} - 0.5rem - 1rem - 0.625rem - 0.5rem)`,
              }}
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
                  onMouseEnter={() => onValueHover?.(item.value)}
                  className={cn(
                    value === item.value && 'bg-input-active',
                    itemClassName,
                  )}
                >
                  {/* <CheckIcon
                    className={cn(
                      'mr-2 size-4',
                      value !== item.value && 'invisible',
                    )}
                  /> */}
                  {labelRender(item.value, item.label, false)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
