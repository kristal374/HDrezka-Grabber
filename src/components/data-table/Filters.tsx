import { Button, type ButtonProps } from '@/components/ui/Button';
import { Dropdown, type DropdownItem } from '@/components/ui/Dropdown';
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
  const [facets, setFacets] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    setFacets(column.getFacetedUniqueValues());
  });
  const data: DropdownItem[] = Array.from(facets.entries()).map(
    ([value, count]) => {
      return {
        value,
        label: value,
        labelComponent,
      };
    },
  );
  return (
    <>
      <span>{title}</span>
      <Dropdown
        data={data}
        clearSelection={true}
        onValuesChange={(values) => {
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
  column: Column<TData>;
  value: any;
}

function FilterValueCell<TData extends Record<string, any>>({
  column,
  value,
}: FilterValueCellProps<TData>) {
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
      {value}
    </Button>
  );
}

export {
  FacetedFilterHeader,
  facetsFilter,
  FilterValueCell,
  FilterValueHeader,
};
