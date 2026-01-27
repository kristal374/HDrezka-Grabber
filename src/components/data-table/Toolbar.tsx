import { useDataTableFeatures } from '@/components/data-table/FeaturesContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import NumberFlow from '@number-flow/react';
import { type Table as TanstackTable } from '@tanstack/react-table';
import { RegexIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToolbarProps<TData extends Record<string, any>> {
  table: TanstackTable<TData>;
}

export function Toolbar<TData extends Record<string, any>>({
  table,
}: ToolbarProps<TData>) {
  const { searchBy, allowRegex } = useDataTableFeatures();

  const [search, setSearch] = useState('');
  const [enableRegex, setEnableRegex] = useState(false);
  const [regexError, setRegexError] = useState('');

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
        <Tooltip open={!!regexError}>
          <TooltipTrigger>
            <div className='flex w-64'>
              <Input
                value={search}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearch(value);
                  setFilterValue(value, enableRegex);
                }}
                placeholder={`Search ${String(searchBy)}`}
                className={cn('grow', allowRegex && 'rounded-r-none')}
              />
              {allowRegex && (
                <Button
                  variant={enableRegex ? 'primary' : 'secondary'}
                  className='rounded-l-none px-2.5 py-2'
                  onClick={() => {
                    const newEnableRegex = !enableRegex;
                    setEnableRegex(newEnableRegex);
                    setFilterValue(search, newEnableRegex);
                  }}
                  title={'Use regular expression to search'}
                >
                  <RegexIcon className='size-4' />
                </Button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent align='start' side='bottom' className='bg-red-900'>
            <p className='text-sm'>{regexError}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>,
    portalHost,
  );
}
