import { Button } from '@/components/ui/Button';
import { cn, IS_FIREFOX } from '@/lib/utils';
import type { Header, Table as TanstackTable } from '@tanstack/react-table';
import { useEffect, useState } from 'react';

interface ResizeHeaderProps<TData extends Record<string, any>>
  extends React.PropsWithChildren {
  table: TanstackTable<TData>;
  header: Header<TData, unknown>;
}

export function ResizeHeader<TData extends Record<string, any>>({
  table,
  header,
  children,
}: ResizeHeaderProps<TData>) {
  const [isResizing, setIsResizing] = useState(false);
  const [deltaOffset, setDeltaOffset] = useState(0);
  useEffect(() => {
    const actual = header.column.getIsResizing();
    if (isResizing !== actual) setIsResizing(actual);
    if (!IS_FIREFOX) return;
    setDeltaOffset(table.getState().columnSizingInfo.deltaOffset ?? 0);
  });

  if (!header.column.getCanResize()) return children;

  return (
    <>
      {children}
      <div className='ml-auto h-full py-2'>
        <Button
          variant={isResizing ? 'primary' : 'secondary'}
          className={cn(
            'h-full w-1.5 cursor-col-resize rounded-sm p-0',
            IS_FIREFOX && 'transition-none',
          )}
          style={{
            transform:
              isResizing && IS_FIREFOX
                ? `translateX(${deltaOffset}px)`
                : undefined,
          }}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onDoubleClick={() => header.column.resetSize()}
        />
      </div>
    </>
  );
}
