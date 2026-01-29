import {
  type BuiltInFilterFn,
  type Row,
  filterFns,
} from '@tanstack/react-table';

export type FilterCondition = {
  type: 'condition';
  columnId: string;
  filterFn: BuiltInFilterFn;
  filterValue: any;
};

export type FilterGroup = {
  type: 'group';
  operator: 'AND' | 'OR';
  children: FilterNode[];
};

export type FilterNode = FilterCondition | FilterGroup;

export function buildGlobalFilter(root: FilterNode) {
  return (row: Row<any>): boolean => {
    if (root.type === 'condition') {
      const fn = filterFns[root.filterFn];
      return fn(
        row,
        root.columnId as string,
        root.filterValue,
        () => undefined,
      );
    }

    const results = root.children.map((child) => buildGlobalFilter(child)(row));

    return root.operator === 'AND'
      ? results.every(Boolean)
      : results.some(Boolean);
  };
}

export function globalFilter<TData extends Record<string, any>>(
  row: Row<TData>,
  _columnId: string,
  filterValue: FilterNode,
) {
  return buildGlobalFilter(filterValue)(row);
}
