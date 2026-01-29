import { useDataTableFeatures } from '@/components/data-table/FeaturesContext';
import { Button } from '@/components/ui/Button';
import { Dropdown, type DropdownItem } from '@/components/ui/Dropdown';
import { Input } from '@/components/ui/Input';
import { SplitElement } from '@/components/ui/SplitElement';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import NumberFlow from '@number-flow/react';
import { type Table as TanstackTable } from '@tanstack/react-table';
import { RegexIcon, Settings2Icon, XCircleIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToolbarProps<TData extends Record<string, any>> {
  table: TanstackTable<TData>;
}

export function Toolbar<TData extends Record<string, any>>({
  table,
}: ToolbarProps<TData>) {
  const { searchBy } = useDataTableFeatures();

  const [currentShownRows, setCurrentShownRows] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  useEffect(() => {
    setCurrentShownRows(table.getRowModel().rows.length);
    setTotalRows(table.getCoreRowModel().rows.length);
  });
  const totalRowsString = totalRows.toString();
  // const numberOfSpaces = Math.floor(totalRowsString.length / 3);
  // const spaces = new Array(numberOfSpaces).fill(' ').join();

  const [portalHost, setPortalHost] = useState<Element | null>(null);
  useLayoutEffect(() => {
    setPortalHost(document.querySelector('#toolbar'));
  }, []);
  if (!portalHost) return null;

  return createPortal(
    <div className='flex items-center gap-3'>
      <p className='mr-auto flex items-baseline text-base font-medium'>
        <span className='grid-stack'>
          <span className='invisible select-none'>
            {`4 ${totalRowsString.replaceAll(/\d/g, '4').slice(0, -1)}`}
          </span>
          <NumberFlow value={currentShownRows} className='ml-auto' />
        </span>
        /<NumberFlow value={totalRows} />
        <span className='ml-1.5'>
          {browser.i18n.getMessage('logger_dataTable_rows')}
        </span>
      </p>
      {searchBy && <SearchInput table={table} />}
      <ColumnVisibilityMenu table={table} />
    </div>,
    portalHost,
  );
}

function SearchInput<TData extends Record<string, any>>({
  table,
}: ToolbarProps<TData>) {
  const { searchBy, allowRegex } = useDataTableFeatures();

  const [search, setSearch] = useState('');
  const [enableRegex, setEnableRegex] = useState(false);
  const [regexError, setRegexError] = useState('');

  const setFilterValue = (value: string, useRegex: boolean) => {
    const lowerCase = value.toLowerCase();
    if (useRegex) {
      try {
        new RegExp(lowerCase);
        if (!!regexError) setRegexError('');
      } catch (err) {
        setRegexError((err as Error).message);
        return;
      }
    }
    table
      .getColumn(searchBy as string)
      ?.setFilterValue(useRegex ? `regex:${lowerCase}` : lowerCase);
  };

  const columnName =
    table.getColumn(searchBy as string)?.columnDef.meta?.headerName ?? '';

  return (
    <Tooltip open={!!regexError}>
      <TooltipTrigger>
        <SplitElement className='w-72'>
          <div className='grow'>
            <Input
              value={search}
              onChange={(e) => {
                const value = e.target.value;
                setSearch(value);
                setFilterValue(value, enableRegex);
              }}
              placeholder={`${browser.i18n.getMessage('ui_search')} ${columnName}`}
              className={cn('w-full', allowRegex && 'rounded-r-none')}
            />
            {!!search && (
              <Button
                variant='ghost'
                size='square-large'
                className={cn(
                  'absolute top-0 right-0 h-full',
                  allowRegex ? 'rounded-none' : 'rounded-l-none',
                )}
                onClick={() => {
                  setSearch('');
                  setFilterValue('', enableRegex);
                }}
                title={browser.i18n.getMessage('ui_clearSearch')}
              >
                <XCircleIcon className='size-4' />
              </Button>
            )}
          </div>
          {allowRegex && (
            <Button
              variant={enableRegex ? 'primary' : 'secondary'}
              size='square-large'
              onClick={() => {
                const newEnableRegex = !enableRegex;
                setEnableRegex(newEnableRegex);
                setFilterValue(search, newEnableRegex);
              }}
              title={browser.i18n.getMessage('logger_dataTable_useRegex')}
            >
              <RegexIcon className='size-4' />
            </Button>
          )}
        </SplitElement>
      </TooltipTrigger>
      <TooltipContent align='start' side='bottom' className='bg-red-900'>
        <p className='text-sm'>{regexError}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function ColumnVisibilityMenu<TData extends Record<string, any>>({
  table,
}: ToolbarProps<TData>) {
  const data: DropdownItem[] = table.getAllColumns().map((column) => {
    return {
      value: column.id,
      label: column.columnDef.meta?.headerName ?? column.id,
      disabled: !column.getCanHide(),
    };
  });
  const initialValues = table
    .getAllColumns()
    .filter((column) => column.getIsVisible())
    .map((column) => column.id);
  return (
    <Dropdown
      data={data}
      value={initialValues}
      onValueClick={(value) => table.getColumn(value)?.toggleVisibility()}
    >
      <Button
        variant='secondary'
        size='square-large'
        title={browser.i18n.getMessage('logger_dataTable_columnVisibility')}
      >
        <Settings2Icon className='size-4' />
      </Button>
    </Dropdown>
  );
}
