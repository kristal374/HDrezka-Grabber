import { cn } from '@/lib/utils';
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useMemo, type JSX } from 'react';

type DataItem = {
  value: string;
  label: string;
  labelComponent?: (
    props: React.PropsWithChildren<{ isRenderingInPreview: boolean }>,
  ) => JSX.Element;
};

interface ComboboxProps {
  id?: string;
  className?: string;
  /**
   * Width of button and min width of combobox content in pixels or rem
   */
  width?: number | string;
  /**
   * Max height of combobox content in pixels or rem
   */
  height?: number | string;
  data: DataItem[];
  value?: string;
  onValueChange?: (value: string) => void;
  needSearch?: boolean;
  showChevron?: boolean;
  title?: string;
  disabled?: boolean;
}

export function Combobox({
  id,
  className,
  width = '14rem', // 224px
  height = '11.5rem', // 184px
  data,
  value = '',
  onValueChange,
  needSearch = true,
  showChevron,
  title,
  disabled,
}: ComboboxProps) {
  const items = useMemo(() => data, []);
  const dv = useMemo(
    () => items.find((item) => item.value === value),
    [items, value],
  );
  const labelRender = useCallback((item: DataItem, isPreview: boolean) => {
    const children = item.label;
    return (
      item.labelComponent?.({
        children,
        isRenderingInPreview: isPreview,
      }) ?? children
    );
  }, []);
  return (
    <ComboboxPrimitive.Root
      items={items}
      value={dv}
      onValueChange={(v) => {
        if (!v) return;
        onValueChange?.(v.value);
      }}
    >
      <div
        className={cn(
          'group relative flex flex-col gap-1 [&>input]:pr-[calc(0.5rem+1.5rem)]',
          // 'has-[.combobox-clear]:[&>input]:pr-[calc(0.5rem+1.5rem*2)]',
        )}
      >
        {needSearch && (
          <ComboboxPrimitive.Input
            id={id}
            className={cn(
              // 'h-10 w-64',
              // 'rounded-md border border-gray-200 bg-[canvas] pl-3.5 text-base font-normal text-gray-900 focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800',
              'focus-ring flex cursor-pointer items-center rounded-md border-[0.125rem] px-2 py-1.5 text-sm',
              'border-input bg-background not-disabled:hover:border-input-active not-disabled:hover:bg-input',
              'placeholder:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
              className,
            )}
            style={{ width }}
            title={title}
            disabled={disabled}
            placeholder={browser.i18n.getMessage('combobox_placeholder')}
          />
        )}
        <ComboboxPrimitive.Value>
          {(item: DataItem) => {
            return (
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 rounded-md select-none group-focus-within:hidden',
                  'flex cursor-pointer items-center rounded-md border-[0.125rem] px-2 py-1.5 text-sm',
                  'border-input bg-background',
                  !disabled
                    ? 'group-hover:border-input-active group-hover:bg-input'
                    : 'cursor-not-allowed opacity-50',
                )}
              >
                {labelRender(item, true)}
              </div>
            );
          }}
        </ComboboxPrimitive.Value>
        <div className='absolute right-2 bottom-0 flex h-10 items-center justify-center text-gray-600'>
          {/* <ComboboxPrimitive.Clear
              className="combobox-clear flex h-10 w-6 items-center justify-center rounded bg-transparent p-0"
              aria-label="Clear selection"
            >
              <XIcon className="size-4" />
            </ComboboxPrimitive.Clear> */}
          {showChevron && (
            <ComboboxPrimitive.Trigger className='flex h-full w-6 items-center justify-center rounded bg-transparent p-0'>
              <ChevronDownIcon className='size-4 opacity-50' />
            </ComboboxPrimitive.Trigger>
          )}
        </div>
      </div>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner className='outline-none' sideOffset={4}>
          <ComboboxPrimitive.Popup
            className={cn(
              'max-h-[23rem] w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)]',
              // 'rounded-md bg-[canvas] text-gray-900 shadow-lg shadow-gray-200 outline-1 outline-gray-200 dark:shadow-none dark:-outline-offset-1 dark:outline-gray-300',
              'transition-[transform,scale,opacity] duration-100 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
              'bg-input text-foreground border-input-active rounded-md border shadow-md outline-none',
            )}
          >
            <ComboboxPrimitive.Empty className='py-6 text-center text-sm empty:m-0 empty:p-0'>
              {browser.i18n.getMessage('combobox_empty')}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List
              className={cn(
                'scroll-container max-h-[min(23rem,var(--available-height))] scroll-py-1 overflow-y-auto overscroll-contain p-1 outline-0 data-[empty]:p-0',
              )}
            >
              {(item: DataItem) => (
                <ComboboxPrimitive.Item
                  key={item.value}
                  value={item}
                  className={cn(
                    // 'grid grid-cols-[0.75rem_1fr]',
                    // 'flex cursor-default items-center gap-2 py-2 pr-8 pl-4 text-base leading-4 outline-none select-none',
                    // 'data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-gray-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-2 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm data-[highlighted]:before:bg-gray-900',
                    'data-[selected]:bg-input-active data-[highlighted]:!bg-link-color data-[highlighted]:text-foreground',
                    'relative flex grow cursor-default items-center rounded-sm px-2 py-1.5 text-sm select-none',
                    'outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  )}
                >
                  {/* <ComboboxPrimitive.ItemIndicator className='col-start-1'>
                    <CheckIcon className='size-3' />
                  </ComboboxPrimitive.ItemIndicator> */}
                  {/* <div className='col-start-2'>{item.label}</div> */}
                  {labelRender(item, false)}
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
