import type { LogMessageWithId } from '@/app/hooks/logger/useUpdateLogArray';
import {
  FacetedFilterHeader,
  facetsFilter,
  FilterValueCell,
  FilterValueHeader,
} from '@/components/data-table/Filters';
import { LogLevel, toFormatTime } from '@/lib/logger';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { chromeDark, ObjectInspector } from 'react-inspector';

export const columns: ColumnDef<LogMessageWithId>[] = [
  {
    accessorKey: 'timestamp',
    size: 100,
    header() {
      return <span className='ml-auto'>Timestamp</span>;
    },
    cell({ row, table }) {
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
    filterFn: facetsFilter,
    meta: {
      Render({ children }: React.PropsWithChildren) {
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
    header({ column }) {
      return (
        <FacetedFilterHeader
          column={column}
          title='Level' // @ts-expect-error
          labelComponent={column.columnDef.meta.Render}
        />
      );
    },
    cell({ row, column }) {
      // @ts-expect-error
      return column.columnDef.meta.Render({
        children: row.original.level,
      });
    },
  },
  {
    accessorKey: 'context',
    size: 90,
    filterFn: facetsFilter,
    meta: {
      Render({ children }: React.PropsWithChildren) {
        return (
          <span className='font-medium capitalize' data-slim='right'>
            {children}
          </span>
        );
      },
    },
    header({ column }) {
      return (
        <FacetedFilterHeader
          column={column}
          title='Context' // @ts-expect-error
          labelComponent={column.columnDef.meta.Render}
        />
      );
    },
    cell({ row, column }) {
      // @ts-expect-error
      return column.columnDef.meta.Render({
        children: row.original.context,
      });
    },
  },
  {
    accessorKey: 'message',
    header: 'Message',
    size: 500,
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
    cell({ row, table }) {
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
    size: 270,
    accessorFn: (data) => {
      const [src] = data.location.replace('src/', '').split(':');
      return src;
    },
    filterFn: facetsFilter,
    header({ column }) {
      return <FacetedFilterHeader column={column} title='Location' />;
    },
    cell({ row }) {
      return (
        <span className='font-medium'>
          {row.original.location.replace('src/', '')}
        </span>
      );
    },
  },
  {
    id: 'sessionId',
    accessorFn: (data) => {
      return data.metadata?.sessionId;
    },
    filterFn: 'equals',
    size: 105,
    header({ column }) {
      return <FilterValueHeader column={column} title='Session ID' />;
    },
    cell({ row, column }) {
      const value = row.getValue('sessionId') as number | undefined;
      return <FilterValueCell column={column} value={value} />;
    },
  },
  {
    id: 'traceId',
    accessorFn: (data) => {
      return data.metadata?.traceId;
    },
    filterFn: 'equals',
    size: 100,
    header({ column }) {
      return <FilterValueHeader column={column} title='Trace ID' />;
    },
    cell({ row, column }) {
      const value = row.getValue('traceId') as number | undefined;
      return <FilterValueCell column={column} value={value} />;
    },
  },
  {
    id: 'targetKey',
    accessorFn: (data) => {
      return data.metadata?.targetKey;
    },
    filterFn: 'equals',
    size: 85,
    header({ column }) {
      return <FilterValueHeader column={column} title='Key' />;
    },
    cell({ row, column }) {
      const value = row.getValue('targetKey') as number | undefined;
      return <FilterValueCell column={column} value={value} />;
    },
  },
];
