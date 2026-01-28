import  { type BuiltInFilterFn, type Row, filterFns } from '@tanstack/react-table';

type FilterCondition<TData extends Record<string, any>> = {
  type: 'condition';
  columnId: keyof TData;
  filterFn: BuiltInFilterFn;
  filterValue: any;
};

type FilterGroup<TData extends Record<string, any>> = {
  type: 'group';
  operator: 'AND' | 'OR';
  children: FilterNode<TData>[];
};

type FilterNode<TData extends Record<string, any>> = FilterCondition<TData> | FilterGroup<TData>;

export function buildLogFilter<TData extends Record<string, any>>(root: FilterNode<TData>) {
  return (row: Row<TData>): boolean => {
    if (root.type === 'condition') {
      const fn = filterFns[root.filterFn];
      return fn(row, root.columnId as string, root.filterValue, () => undefined);
    }

    const results = root.children.map((child) => buildLogFilter(child)(row));

    return root.operator === 'AND'
      ? results.every(Boolean)
      : results.some(Boolean);
  };
}

export function globalFilter<TData extends Record<string, any>>(
  row: Row<TData>,
  _columnId: string,
  match: (row: Row<TData>) => boolean,
) {
  return match(row)
}