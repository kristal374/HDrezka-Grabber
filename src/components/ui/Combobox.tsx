import { cn } from '@/lib/utils';
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { ChevronDownIcon } from 'lucide-react';
import { useCallback, useState } from 'react';

type DataItem = {
  value: string;
  label: string;
  labelComponent?: (
    props: React.PropsWithChildren<{ isRenderingInPreview: boolean }>,
  ) => React.ReactNode;
};

export { DataItem as ComboboxItem };

interface ComboboxProps {
  /**
   * Id of the combobox to activate it via <label /> element
   */
  id?: string;
  /**
   * ClassName for the inner combobox elements (input, trigger button)
   */
  className?: string;
  /**
   * ClassName for the items in the list
   */
  itemClassName?: string;
  /**
   * ClassName for the combobox container to change position of whole combobox
   */
  containerClassName?: string;
  /**
   * Width of button and min width of combobox content in pixels or rem
   */
  width?: number | string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  data: DataItem[];
  value?: string;
  onValueChange?: (value: string) => void;
  onValueHover?: (value: string) => void;
  needSearch?: boolean;
  showChevron?: boolean;
  title?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function Combobox({
  id,
  className,
  itemClassName,
  containerClassName,
  width = '14rem', // 224px
  align = 'center',
  side,
  data,
  value = '',
  onValueChange,
  onValueHover,
  needSearch,
  showChevron,
  title,
  placeholder,
  disabled,
}: ComboboxProps) {
  const items = data;
  const selectedItem = items.find((item) => item.value === value);
  const labelRender = useCallback((item: DataItem, isPreview: boolean) => {
    const children = item.label;
    return (
      item.labelComponent?.({
        children,
        isRenderingInPreview: isPreview,
      }) ?? children
    );
  }, []);

  const [inputValue, setInputValue] = useState(!needSearch ? '' : undefined);

  return (
    <ComboboxPrimitive.Root
      items={items}
      value={selectedItem}
      autoHighlight={true}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      onValueChange={(item) => {
        if (item) onValueChange?.(item.value);
      }}
      onItemHighlighted={(item) => {
        if (item) onValueHover?.(item.value);
      }}
      isItemEqualToValue={(item, selected) => {
        return item?.value === selected?.value;
      }}
    >
      <div
        className={cn(
          'group relative grid',
          showChevron && '&>[data-combobox-adjustable-trigger-element]:pr-6.5',
          // 'has-[.combobox-clear]:[&>[data-combobox-adjustable-trigger-element]]:pr-12.5',
          'focus-ring focus-ring-within rounded-md border-[0.125rem] text-sm',
          'text-foreground border-input bg-background aria-disabled:opacity-50',
          'not-aria-disabled:hover:border-input-active not-aria-disabled:hover:bg-input',
          containerClassName,
        )}
        style={{ width }}
        title={title}
        aria-disabled={disabled}
      >
        <ComboboxPrimitive.Trigger
          id={!needSearch ? id : undefined}
          className={cn(
            'col-start-1 row-start-1 outline-none',
            'cursor-pointer disabled:cursor-not-allowed',
          )}
          disabled={disabled}
        />
        {needSearch && (
          <ComboboxPrimitive.Input
            id={id}
            className={cn(
              'col-start-1 row-start-1 outline-none',
              'placeholder:text-foreground/70 selection:bg-link-color bg-transparent px-2 py-1.5',
              'not-disabled:cursor-pointer not-disabled:focus:cursor-text disabled:hidden disabled:cursor-not-allowed',
              !inputValue && 'not-focus:opacity-0',
              className,
            )}
            style={{ width }}
            placeholder={placeholder ?? browser.i18n.getMessage('ui_search')}
            onClick={(e) => {
              // @ts-ignore
              e.target.setSelectionRange(0, -1);
            }}
            disabled={disabled}
            data-combobox-adjustable-trigger-element
          />
        )}
        <ComboboxPrimitive.Value>
          {(item: DataItem | null) => {
            return (
              <div
                className={cn(
                  'pointer-events-none col-start-1 row-start-1',
                  'flex cursor-pointer items-center px-2 py-1.5 select-none',
                  needSearch && 'group-focus-within:invisible',
                  !item && 'text-foreground/70',
                  className,
                )}
                data-combobox-adjustable-trigger-element
              >
                {item
                  ? labelRender(item, true)
                  : (placeholder ?? browser.i18n.getMessage('ui_selectValue'))}
              </div>
            );
          }}
        </ComboboxPrimitive.Value>
        <div className='pointer-events-none absolute right-0 flex h-full items-center justify-center py-1.5 pr-0.5'>
          {/* <ComboboxPrimitive.Clear
              className="combobox-clear flex size-6 items-center justify-center"
              aria-label="Clear selection"
            >
              <XIcon className="size-4" />
            </ComboboxPrimitive.Clear> */}
          {showChevron && (
            <ComboboxPrimitive.Icon className='flex size-6 items-center justify-center'>
              <ChevronDownIcon className='size-4 opacity-50' />
            </ComboboxPrimitive.Icon>
          )}
        </div>
      </div>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          className='outline-none'
          align={align}
          side={side}
          sideOffset={4}
        >
          <ComboboxPrimitive.Popup
            className={cn(
              'max-h-[23rem] max-w-(--available-width) min-w-(--anchor-width) origin-(--transform-origin)',
              'transition-[transform,scale,opacity] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
              'bg-input text-foreground border-input-active rounded-md border shadow-md outline-none',
            )}
          >
            <ComboboxPrimitive.Empty className='px-2.5 py-6 text-center text-sm empty:m-0 empty:p-0'>
              {browser.i18n.getMessage('ui_noResults')}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List
              className={cn(
                'scroll-container max-h-[min(23rem,var(--available-height))] scroll-py-1 overflow-y-auto overscroll-contain p-1 outline-0 data-empty:p-0',
              )}
            >
              {(item: DataItem) => (
                <ComboboxPrimitive.Item
                  key={item.value}
                  value={item}
                  className={cn(
                    'data-selected:bg-input-active data-highlighted:bg-link-color! data-highlighted:text-foreground',
                    'relative flex grow cursor-default items-center rounded-sm px-2 py-1.5 text-sm select-none',
                    'outline-none data-disabled:pointer-events-none data-disabled:opacity-50',
                    itemClassName,
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
