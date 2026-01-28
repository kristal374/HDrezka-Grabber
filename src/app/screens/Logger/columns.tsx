import type { LogMessageWithId } from '@/app/hooks/logger/useUpdateLogArray';
import {
  FacetedFilterHeader,
  facetsFilter,
  FilterValueCell,
  FilterValueHeader,
} from '@/components/data-table/Filters';
import { ResizeHeader } from '@/components/data-table/HeaderCell';
import { LogLevel, toFormatTime } from '@/lib/logger';
import { cn } from '@/lib/utils';
import type {
  CellContext,
  Column,
  ColumnDef,
  ColumnMeta,
  RowData,
} from '@tanstack/react-table';
import { chromeDark, ObjectInspector } from 'react-inspector';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /**
     * Header name to display in column visibility menu
     */
    headerName: string;
    /**
     * Component to render value for the column
     */
    Render?: (props: React.PropsWithChildren) => React.ReactNode;
  }
}

/**
 * Get `meta` object for the column
 */
function meta<TData extends Record<string, any>>(column: Column<TData>) {
  return column.columnDef.meta ?? ({} as ColumnMeta<TData, unknown>);
}

/**
 * Component to render value for the column if it has a `meta.Render` function
 */
function RenderValue<TData extends Record<string, any>>(
  props: CellContext<TData, unknown>,
) {
  return meta(props.column).Render?.({
    children: props.row.getValue(props.column.id),
  });
}

export const columns: ColumnDef<LogMessageWithId>[] = [
  {
    accessorKey: 'timestamp',
    size: 100,
    enableHiding: false,
    meta: {
      headerName: 'Timestamp',
    },
    header: ({ column }) => (
      <span className='ml-auto'>{meta(column).headerName}</span>
    ),
    cell: ({ row, table, column }) => {
      if (row.index === 0) return toFormatTime(row.original.timestamp, 0);
      let prev = table.getRow(String(row.index - 1)).original.timestamp;
      const current = row.original.timestamp;
      if (
        row.columnFilters.level ||
        row.columnFilters.context ||
        row.columnFilters.message
      ) {
        prev = 0;
      }
      return (
        <span className='ml-auto' data-slim='right'>
          {toFormatTime(current, prev)}
        </span>
      );
    },
  },
  {
    accessorKey: 'level',
    size: 90,
    enableResizing: false,
    filterFn: facetsFilter,
    meta: {
      headerName: 'Level',
      Render: ({ children }) => {
        const level = children as LogLevel;
        return (
          <span
            className={cn(
              'mb-auto rounded-md px-1.5 font-medium',
              level === LogLevel.CRITICAL && 'bg-white text-red-500',
              level === LogLevel.ERROR && 'bg-red-800',
              level === LogLevel.WARNING && 'bg-yellow-700',
              level === LogLevel.INFO && 'bg-blue-700',
              level === LogLevel.DEBUG && 'bg-green-700',
            )}
            data-critical={level === LogLevel.CRITICAL}
            data-slim='right'
          >
            {LogLevel[level]}
          </span>
        );
      },
    },
    header: ({ column }) => (
      <FacetedFilterHeader
        column={column}
        title={meta(column).headerName}
        labelComponent={meta(column).Render}
      />
    ),
    cell: RenderValue,
  },
  {
    accessorKey: 'context',
    size: 100,
    enableResizing: false,
    filterFn: facetsFilter,
    meta: {
      headerName: 'Context',
      Render: ({ children }) => (
        <span className='font-medium capitalize' data-slim='right'>
          {children}
        </span>
      ),
    },
    header: ({ column }) => (
      <FacetedFilterHeader
        column={column}
        title={meta(column).headerName}
        labelComponent={meta(column).Render}
      />
    ),
    cell: RenderValue,
  },
  {
    accessorKey: 'message',
    size: 500,
    enableHiding: false,
    filterFn: (row, _columnId, filterValue) => {
      return row.original.message
        .map((elem) => {
          const value = (
            typeof elem === 'object' ? JSON.stringify(elem) : String(elem)
          ).toLowerCase();
          return filterValue.startsWith('regex:')
            ? new RegExp(filterValue.replace('regex:', '')).test(value)
            : value.includes(filterValue);
        })
        .some((elem) => elem === true);
    },
    meta: {
      headerName: 'Message',
    },
    header: (props) => (
      <ResizeHeader {...props}>{meta(props.column).headerName}</ResizeHeader>
    ),
    cell: ({ row, table }) => {
      let isExpanded = false;
      // if (
      //   table.getColumn('message')?.getIsFiltered() &&
      //   row.columnFilters.message === true
      // ) {
      //   isExpanded = true;
      // }
      return (
        <div className='flex w-full flex-col gap-1'>
          {row.original.message.map((elem, i) => {
            if (typeof elem === 'object') {
              return (
                <ObjectInspector
                  key={i}
                  data={elem}
                  expandLevel={isExpanded ? 5 : undefined}
                  // @ts-ignore
                  theme={{ ...chromeDark, BASE_BACKGROUND_COLOR: '#0000' }}
                />
              );
            }
            return <span key={i}>{String(elem)}</span>;
          })}
        </div>
      );
    },
  },
  {
    id: 'location',
    size: 265,
    accessorFn: (data) => {
      const [src] = data.location.replace('src/', '').split(':');
      return src;
    },
    filterFn: facetsFilter,
    meta: {
      headerName: 'Location',
    },
    header: (props) => (
      <ResizeHeader {...props}>
        <FacetedFilterHeader
          column={props.column}
          title={meta(props.column).headerName}
        />
      </ResizeHeader>
    ),
    cell: ({ row }) => (
      <span className='font-medium'>
        {row.original.location.replace('src/', '')}
      </span>
    ),
  },
  {
    id: 'sessionId',
    accessorFn: (data) => {
      return data.metadata?.sessionId;
    },
    size: 105,
    enableResizing: false,
    filterFn: 'equals',
    meta: {
      headerName: 'Session ID',
    },
    header: ({ column }) => (
      <FilterValueHeader column={column} title={meta(column).headerName} />
    ),
    cell: FilterValueCell,
  },
  {
    id: 'traceId',
    accessorFn: (data) => {
      return data.metadata?.traceId;
    },
    size: 100,
    enableResizing: false,
    filterFn: 'equals',
    meta: {
      headerName: 'Trace ID',
    },
    header: ({ column }) => (
      <FilterValueHeader column={column} title={meta(column).headerName} />
    ),
    cell: FilterValueCell,
  },
  {
    id: 'targetKey',
    accessorFn: (data) => {
      return data.metadata?.targetKey;
    },
    size: 85,
    enableResizing: false,
    filterFn: 'equals',
    meta: {
      headerName: 'Key',
    },
    header: ({ column }) => (
      <FilterValueHeader column={column} title={meta(column).headerName} />
    ),
    cell: FilterValueCell,
  },
];
