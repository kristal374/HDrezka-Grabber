import { CopyButton } from '@/components/CopyButton';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Dropdown, type DropdownItem } from '@/components/ui/Dropdown';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import NumberFlow from '@number-flow/react';
import { type Column, type Row } from '@tanstack/react-table';
import { ListFilterIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

function facetsFilter<TData extends Record<string, any>>(
  row: Row<TData>,
  columnId: string,
  value: string[],
) {
  return value.includes(row.getValue(columnId));
}

function getFacetedColumnData(
  facets: Map<any, number>,
  labelComponent?: DropdownItem['labelComponent'],
) {
  const data = Array.from(facets.entries())
    .map(([value, count]) => {
      return {
        value,
        label: value,
        labelComponent,
      };
    })
    .sort((a, b) => {
      if (isFinite(parseInt(a.label)) || isFinite(parseInt(b.label))) {
        return a.label > b.label ? -1 : a.label < b.label ? 1 : 0;
      }
      return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
    }) satisfies DropdownItem[];
  return data;
}

interface FilterComponentProps<TData extends Record<string, any>> {
  column: Column<TData>;
}

function FacetedFilterHeader<TData extends Record<string, any>>({
  column,
  labelComponent,
}: FilterComponentProps<TData> & {
  labelComponent?: DropdownItem['labelComponent'];
}) {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [facets, setFacets] = useState(() => column.getFacetedUniqueValues());
  useEffect(() => {
    setFacets(column.getFacetedUniqueValues());
  });
  const data = getFacetedColumnData(facets, labelComponent);
  const title = column.columnDef.meta?.headerName ?? column.id;
  return (
    <>
      <span>{title}</span>
      <Dropdown
        data={data}
        clearSelection={true}
        onValueChange={(values) => {
          column.setFilterValue(values.length ? values : undefined);
          setSelectedValues(values);
        }}
      >
        <FilterButton amount={selectedValues.length} />
      </Dropdown>
    </>
  );
}

function FilterValueHeader<TData extends Record<string, any>>({
  column,
}: FilterComponentProps<TData>) {
  const [isFiltered, setIsFiltered] = useState(false);
  useEffect(() => {
    setIsFiltered(column.getIsFiltered());
  });
  const title = column.columnDef.meta?.headerName ?? column.id;
  return (
    <>
      <span>{title}</span>
      {isFiltered && (
        <FilterButton
          amount={'*'}
          onClick={() => column.setFilterValue(undefined)}
        />
      )}
    </>
  );
}

interface FilterButtonProps extends Omit<
  ButtonProps,
  'variant' | 'size' | 'children'
> {
  amount: number | '*';
}

function FilterButton({ amount, className, ...props }: FilterButtonProps) {
  return (
    <Button
      variant={!amount ? 'secondary' : 'primary'}
      size='square'
      className={cn('relative', className)}
      {...props}
    >
      <ListFilterIcon
        className={cn('size-4 transition-opacity', !!amount && 'opacity-0')}
      />
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center font-semibold transition-opacity',
          !amount && 'opacity-0',
        )}
      >
        {amount === '*' ? '*' : <NumberFlow value={amount} />}
      </div>
    </Button>
  );
}

interface FilterValueCellProps<TData extends Record<string, any>> {
  row: Row<TData>;
  column: Column<TData>;
}

function FilterValueCell<TData extends Record<string, any>>({
  row,
  column,
}: FilterValueCellProps<TData>) {
  const value = row.getValue(column.id);
  if (!value) return null;
  return (
    <>
      <Button
        variant='secondary'
        onClick={() => {
          const isFiltered = column.getFilterValue() === value;
          column.setFilterValue(isFiltered ? undefined : value);
        }}
        className='mb-auto px-1 py-0'
        data-slim='right'
      >
        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
      </Button>
      <CopyButton
        content={String(value)}
        className='invisible mb-auto ml-2 group-focus-within/row:visible group-hover/row:visible [&>svg]:size-3'
      />
    </>
  );
}

interface FilterValueInputProps<TData extends Record<string, any>> {
  column: Column<TData>;
  value: any;
  onValueChange: (value: any) => void;
  disabled?: boolean;
}

function DefaultFilterValueInput({
  value,
  onValueChange,
  disabled,
}: FilterValueInputProps<any>) {
  return (
    <Input
      style={{ width: '14rem' }}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      disabled={disabled}
    />
  );
}

function FacetedFilterValueInput<TData extends Record<string, any>>({
  column,
  value,
  onValueChange,
  disabled,
}: FilterValueInputProps<TData>) {
  const facets = column.getFacetedUniqueValues();
  const data = getFacetedColumnData(facets, column.columnDef.meta?.Render);
  return (
    <Combobox
      data={data}
      value={value}
      onValueChange={onValueChange}
      showChevron
      disabled={disabled}
    />
  );
}

export {
  DefaultFilterValueInput,
  FacetedFilterHeader,
  FacetedFilterValueInput,
  facetsFilter,
  FilterValueCell,
  FilterValueHeader,
};
export type { FilterValueInputProps };
