import { Input } from '@/components/ui/Input';
import NumberFlow from '@number-flow/react';
import { type Table as TanstackTable } from '@tanstack/react-table';
import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToolbarProps<TData extends Record<string, any>> {
  table: TanstackTable<TData>;
  searchBy?: keyof TData;
  searchValue?: string;
}

export function Toolbar<TData extends Record<string, any>>({
  table,
  searchBy,
}: ToolbarProps<TData>) {
  const [search, setSearch] = useState('');
  const [currentShownRows, setCurrentShownRows] = useState(0);
  useEffect(() => {
    setCurrentShownRows(table.getRowModel().rows.length);
  });

  const [portalHost, setPortalHost] = useState<Element | null>(null);
  useLayoutEffect(() => {
    setPortalHost(document.querySelector('#toolbar'));
  }, []);
  if (!portalHost) return null;

  const totalRowsString = String(table.getCoreRowModel().rows.length);

  return createPortal(
    <div className='flex items-center gap-3'>
      <p className='mr-auto flex text-base font-medium'>
        <span className='grid-stack'>
          <span className='invisible select-none'>
            {`4${new Array(Math.floor(totalRowsString.length / 3))
              .fill(' ')
              .join()}${totalRowsString.replaceAll(/\d/g, '4').slice(0, -1)}`}
          </span>
          <NumberFlow value={currentShownRows} className='ml-auto' />
        </span>
        /{totalRowsString} rows
      </p>
      {searchBy && (
        <Input
          value={search}
          onChange={(e) => {
            const value = e.target.value;
            setSearch(value);
            table
              .getColumn(searchBy as string)
              ?.setFilterValue(value.toLowerCase());
          }}
          placeholder={`Search ${String(searchBy)}`}
          className='w-64'
        />
      )}
    </div>,
    portalHost,
  );
}
