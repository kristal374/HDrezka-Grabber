import { type Row, filterFns } from '@tanstack/react-table';

const filterFunctions = { ...filterFns };

type FilterGroup = {
  type: 'group';
  operator: 'AND' | 'OR';
  children: FilterNode[];
};

type FilterCondition = {
  type: 'condition';
  columnId: string;
  filterFn: keyof typeof filterFns;
  filterValue: any;
  skip?: boolean;
};

type FilterNode = FilterCondition | FilterGroup;

function buildGlobalFilter(node: FilterNode) {
  return (row: Row<any>): boolean => {
    if (node.type === 'condition') {
      const fn = filterFunctions[node.filterFn];
      return fn(
        row,
        node.columnId as string,
        node.filterValue,
        () => undefined,
      );
    }

    const results = node.children
      .filter((child) => {
        if (child.type === 'condition' && child.skip) return false;
        return true;
      })
      .map((child) => buildGlobalFilter(child)(row));

    return node.operator === 'AND'
      ? results.every(Boolean)
      : results.some(Boolean);
  };
}

function globalFilter<TData extends Record<string, any>>(
  row: Row<TData>,
  _columnId: string,
  filterValue: FilterGroup,
) {
  return buildGlobalFilter(filterValue)(row);
}

export { buildGlobalFilter, filterFunctions, globalFilter };
export type { FilterCondition, FilterGroup, FilterNode };
