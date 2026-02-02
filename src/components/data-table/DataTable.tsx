import { globalFilter } from '@/components/data-table/globalFilter';
import { GlobalFilter } from '@/components/data-table/GlobalFilterComposer';
import { Toolbar } from '@/components/data-table/Toolbar';
import { cn, IS_FIREFOX } from '@/lib/utils';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type GlobalFilterTableState,
  type Table as TanstackTable,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useLayoutEffect, useRef, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './Table';

function getColumnWidths(table: TanstackTable<any>) {
  const tableColumns = table
    .getAllColumns()
    .filter((column) => column.getIsVisible());
  const columnWidths = Object.fromEntries(
    tableColumns.map((column, i) => [`--column-${i}`, `${column.getSize()}px`]),
  ) as React.CSSProperties;
  return columnWidths;
}

interface DataTableProps<TData extends Record<string, any>> {
  columns: ColumnDef<TData>[];
  data: TData[];
  showToolbar?: boolean;
  className?: string;
}

export function RealtimeTable<TData extends Record<string, any>>({
  columns,
  data,
  showToolbar,
  forceRealtime,
  resetScrollFromBottom,
  onScrollStart,
  onScrollEnd,
  className,
}: DataTableProps<TData> & {
  forceRealtime?: boolean;
  resetScrollFromBottom?: boolean;
  onScrollStart?: () => void;
  onScrollEnd?: (scrollFromBottom: number) => void;
}) {
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onColumnFiltersChange: setFilters,
    onColumnVisibilityChange: setColumnVisibility,
    columnResizeMode: IS_FIREFOX ? 'onEnd' : 'onChange',
    defaultColumn: {
      minSize: 135,
    },
    state: {
      columnFilters: filters,
      columnVisibility,
    },
  });

  const tableContainerRef = useRef<HTMLTableElement>(null);
  const isScrollInProgressRef = useRef(false);
  const ignoreScrollEndRef = useRef(true);
  const ignoreScrollTimerRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;
    if (!resetScrollFromBottom) return;
    // console.log('setting ignore');
    ignoreScrollEndRef.current = true;
    const timer = ignoreScrollTimerRef.current;
    if (timer) window.clearTimeout(timer);
    ignoreScrollTimerRef.current = window.setTimeout(() => {
      // console.log('ignore phase done');
      ignoreScrollEndRef.current = false;
      window.clearTimeout(ignoreScrollTimerRef.current!);
    }, 250);
    container.scrollTop = container.scrollHeight;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [data.length, resetScrollFromBottom, forceRealtime ? null : data.at(-1)]);

  return (
    <div
      className={cn(
        'scrollbar-solid relative h-full w-full overflow-auto',
        className,
      )}
      ref={tableContainerRef}
      onScroll={() => {
        // console.log('scroll event, ignore', ignoreScrollEndRef.current);
        if (ignoreScrollEndRef.current) return;
        if (isScrollInProgressRef.current) return;
        isScrollInProgressRef.current = true;
        if (forceRealtime) return;
        onScrollStart?.();
      }}
      onScrollEnd={() => {
        // console.log('scroll end event, ignore', ignoreScrollEndRef.current);
        if (ignoreScrollEndRef.current) return;
        isScrollInProgressRef.current = false;
        const container = tableContainerRef.current;
        if (!container) return;
        if (container.scrollTop < container.scrollHeight) {
          if (forceRealtime) return;
          onScrollEnd?.(container.scrollHeight - container.scrollTop);
        }
      }}
    >
      {showToolbar && <Toolbar table={table} />}
      <Table
        id='realtime'
        className='isolate'
        style={{ ...getColumnWidths(table) }}
      >
        <TableHeader className='sticky top-0 z-1'>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className='flex'>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{
                      width: `var(--column-${header.column.getIndex()})`,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody
          onClick={() => {
            if (forceRealtime) return;
            const container = tableContainerRef.current;
            if (!container) return;
            onScrollStart?.();
            onScrollEnd?.(container.scrollHeight - container.scrollTop);
          }}
        >
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
                className='flex w-full has-data-[critical="true"]:bg-red-500/30'
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    style={{
                      width: `var(--column-${cell.column.getIndex()})`,
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className='p-10 text-center'>
                {browser.i18n.getMessage('ui_noResults')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function StableTable<TData extends Record<string, any>>({
  columns,
  data,
  showToolbar,
  scrollFromBottom,
  className,
}: DataTableProps<TData> & {
  scrollFromBottom: number;
}) {
  // const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 100 });
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>(
    [],
  );
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const [globalFilterValue, setGlobalFilterValue] =
    useState<GlobalFilterTableState>();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    // getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setFilters,
    onGlobalFilterChange: setGlobalFilterValue,
    // onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    columnResizeMode: IS_FIREFOX ? 'onEnd' : 'onChange',
    globalFilterFn: globalFilter,
    defaultColumn: {
      minSize: 135,
    },
    state: {
      sorting,
      columnFilters: filters,
      globalFilter: globalFilterValue,
      // pagination,
      columnVisibility,
      rowSelection,
    },
  });

  const tableContainerRef = useRef<HTMLTableElement>(null);

  const { rows } = table.getRowModel();

  //dynamic row height virtualization - alternatively you could use a simpler fixed row height strategy without the need for `measureElement`
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => 45, //estimate row height for accurate scrollbar dragging
    getScrollElement: () => tableContainerRef.current,
    //measure dynamic row height, except in firefox because it measures table border height incorrectly
    measureElement: !IS_FIREFOX
      ? (element) => element?.getBoundingClientRect().height
      : undefined,
    overscan: 25,
  });

  useLayoutEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight - scrollFromBottom;
    });
  }, [data.length, scrollFromBottom]);

  // console.log('rendering stable table');

  return (
    <div
      className={cn(
        'scrollbar-solid relative isolate h-full w-full overflow-auto',
        className,
      )}
      ref={tableContainerRef}
    >
      {showToolbar && <Toolbar table={table} />}
      {showToolbar && <GlobalFilter table={table} />}
      <Table
        id='stable'
        style={{
          height: rowVirtualizer.getTotalSize(),
          ...getColumnWidths(table),
        }}
      >
        <TableHeader className='sticky top-0 z-1 w-full'>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className='flex'>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{
                      width: `var(--column-${header.column.getIndex()})`,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rowVirtualizer.getVirtualItems().length ? (
            rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  data-index={virtualRow.index} //needed for dynamic row height measurement
                  ref={(node) => rowVirtualizer.measureElement(node)} //measure dynamic row height
                  className='absolute flex w-full has-data-[critical="true"]:bg-red-500/30'
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className='flex'
                      style={{
                        width: `var(--column-${cell.column.getIndex()})`,
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className='p-10 text-center'>
                {browser.i18n.getMessage('ui_noResults')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
