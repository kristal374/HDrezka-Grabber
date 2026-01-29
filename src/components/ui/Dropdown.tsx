import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { CheckIcon, XCircleIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type DataItem = {
  value: string;
  label: string;
  disabled?: boolean;
  labelComponent?: (props: React.PropsWithChildren) => React.ReactNode;
};

export { DataItem as DropdownItem };

type DropdownProps = {
  /**
   * ClassName for the items in the list
   */
  itemClassName?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Allow multiple selection
   * @default true
   */
  multiple?: boolean;
  data: DataItem[];
  onValueHover?: (value: string) => void;
  onValueClick?: (value: string) => void;
  // needSearch?: boolean;
  clearSelection?: boolean;
  children: React.ReactElement;
} & (
  | {
      multiple?: true;
      value?: string[];
      onValueChange?: (values: string[]) => void;
    }
  | {
      multiple: false;
      value?: string;
      onValueChange?: (value: string) => void;
    }
);

export function Dropdown({
  itemClassName,
  align = 'end',
  side,
  multiple = true,
  data,
  value,
  onValueChange,
  onValueHover,
  onValueClick,
  // needSearch,
  clearSelection,
  children,
}: DropdownProps) {
  const items = data;
  const [selectedItems, setSelectedItems] = useState<DataItem[]>([]);
  useEffect(() => {
    setSelectedItems(
      value ? items.filter((item) => value.includes(item.value)) : [],
    );
  }, [value]);
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
      value={multiple ? selectedItems : (selectedItems[0] ?? null)}
      multiple={multiple}
      autoHighlight={true}
      onValueChange={(values) => {
        const isMulti = Array.isArray(values);
        // prettier-ignore
        const newValues = isMulti
          ? values : !!values ? [values] : [];
        setSelectedItems(newValues);
        if (!values) return;
        onValueChange?.(
          // @ts-expect-error
          isMulti ? values.map((item) => item.value) : values.value,
        );
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
              'max-h-[26rem] max-w-(--available-width) min-w-[max(9.5rem,var(--anchor-width))] origin-(--transform-origin)',
              'transition-[transform,scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
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
                    'data-highlighted:bg-link-color! data-highlighted:text-foreground',
                    'relative grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none',
                    'outline-none data-disabled:pointer-events-none data-disabled:opacity-50',
                    itemClassName,
                  )}
                  disabled={item.disabled}
                  onClick={() => onValueClick?.(item.value)}
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
                    if (!multiple) return;
                    // @ts-expect-error
                    onValueChange?.([]);
                  }}
                >
                  <XCircleIcon className='size-4' />
                  {browser.i18n.getMessage('ui_clearSelection')}
                </Button>
              </div>
            )}
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
