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

function useFacetedColumnData<TData extends Record<string, any>>(
  column: Column<TData>,
  labelComponent?: DropdownItem['labelComponent'],
) {
  const [facets, setFacets] = useState(() => column.getFacetedUniqueValues());
  useEffect(() => {
    setFacets(column.getFacetedUniqueValues());
  });
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
  title: string;
}

function FacetedFilterHeader<TData extends Record<string, any>>({
  column,
  title,
  labelComponent,
}: FilterComponentProps<TData> & {
  labelComponent?: DropdownItem['labelComponent'];
}) {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const data = useFacetedColumnData(column, labelComponent);
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
  title,
}: FilterComponentProps<TData>) {
  const [isFiltered, setIsFiltered] = useState(false);
  useEffect(() => {
    setIsFiltered(column.getIsFiltered());
  });
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

interface FilterButtonProps extends ButtonProps {
  amount: number | '*';
}

function FilterButton({ amount, ...props }: FilterButtonProps) {
  return (
    <Button
      variant={!amount ? 'secondary' : 'primary'}
      size='square'
      className='relative'
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
  );
}

interface FilterValueInputProps<TData extends Record<string, any>> {
  column: Column<TData>;
  value: any;
  onValueChange: (value: any) => void;
}

function DefaultFilterValueInput({
  value,
  onValueChange,
}: FilterValueInputProps<any>) {
  return (
    <Input
      style={{ width: '14rem' }}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    />
  );
}

function FacetedFilterValueInput<TData extends Record<string, any>>({
  column,
  value,
  onValueChange,
}: FilterValueInputProps<TData>) {
  const data = useFacetedColumnData(column, column.columnDef.meta?.Render);
  return (
    <Combobox
      data={data}
      value={value}
      onValueChange={onValueChange}
      showChevron
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
