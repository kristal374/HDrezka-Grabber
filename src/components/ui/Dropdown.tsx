import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { CheckIcon, XCircleIcon } from 'lucide-react';
import { useCallback, useEffect, useState, type JSX } from 'react';

type DataItem = {
  value: string;
  label: string;
  labelComponent?: (props: React.PropsWithChildren) => JSX.Element;
};

export { DataItem as DropdownItem };

interface DropdownProps {
  /**
   * ClassName for the items in the list
   */
  itemClassName?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  data: DataItem[];
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  onValueHover?: (value: string) => void;
  needSearch?: boolean;
  clearSelection?: boolean;
  children: React.ReactElement;
}

export function Dropdown({
  itemClassName,
  align = 'end',
  side,
  data,
  values,
  onValuesChange,
  onValueHover,
  needSearch,
  clearSelection,
  children,
}: DropdownProps) {
  const items = data;
  const [selectedItems, setSelectedItems] = useState<DataItem[]>([]);
  useEffect(() => {
    setSelectedItems(
      values ? items.filter((item) => values.includes(item.value)) : [],
    );
  }, [values]);
  const labelRender = useCallback((item: DataItem, isPreview: boolean) => {
    const children = item.label;
    return (
      item.labelComponent?.({
        children,
      }) ?? children
    );
  }, []);

  return (
    <ComboboxPrimitive.Root
      items={items}
      value={selectedItems}
      multiple={true}
      autoHighlight={true}
      onValueChange={(values) => {
        setSelectedItems(values);
        onValuesChange?.(values.map((item) => item.value));
      }}
      onItemHighlighted={(item) => {
        if (item) onValueHover?.(item.value);
      }}
      isItemEqualToValue={(item, selected) => {
        return item?.value === selected?.value;
      }}
    >
      <ComboboxPrimitive.Trigger render={children} />
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          className='z-100 outline-none'
          align={align}
          side={side}
          sideOffset={4}
        >
          <ComboboxPrimitive.Popup
            className={cn(
              'max-h-[26rem] max-w-(--available-width) min-w-(--anchor-width) origin-(--transform-origin)',
              'transition-[transform,scale,opacity] duration-300 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
              'bg-input text-foreground border-input-active rounded-md border shadow-md outline-none',
            )}
          >
            <ComboboxPrimitive.Empty className='px-2.5 py-6 text-center text-sm empty:m-0 empty:p-0'>
              {browser.i18n.getMessage('combobox_empty')}
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
                    'data-highlighted:bg-link-color! data-highlighted:text-foreground',
                    'relative grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none',
                    'outline-none data-disabled:pointer-events-none data-disabled:opacity-50',
                    itemClassName,
                  )}
                >
                  <ComboboxPrimitive.ItemIndicator className='invisible col-start-1 data-selected:visible'>
                    <CheckIcon className='size-4' />
                  </ComboboxPrimitive.ItemIndicator>
                  <div className='col-start-2 flex items-center'>
                    {labelRender(item, false)}
                  </div>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
            {clearSelection && !!selectedItems?.length && (
              <div className='border-input-active flex w-full border-t p-1'>
                <Button
                  variant='dangerous'
                  className='grow pl-2'
                  onClick={() => {
                    setSelectedItems([]);
                    onValuesChange?.([]);
                  }}
                >
                  <XCircleIcon className='size-4' />
                  Clear selection
                </Button>
              </div>
            )}
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
