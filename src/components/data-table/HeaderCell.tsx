import { Button } from '@/components/ui/Button';
import type { Header } from '@tanstack/react-table';
import { useEffect, useState } from 'react';

interface ResizeHeaderProps<TData extends Record<string, any>>
  extends React.PropsWithChildren {
  header: Header<TData, unknown>;
}

export function ResizeHeader<TData extends Record<string, any>>({
  header,
  children,
}: ResizeHeaderProps<TData>) {
  const [isResizing, setIsResizing] = useState(false);
  useEffect(() => {
    const actual = header.column.getIsResizing();
    if (isResizing !== actual) setIsResizing(actual);
  });

  if (!header.column.getCanResize()) return children;

  return (
    <>
      {children}
      <div className='ml-auto h-full py-2'>
        <Button
          variant={isResizing ? 'primary' : 'secondary'}
          className='h-full w-1.5 cursor-col-resize rounded-sm p-0'
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onDoubleClick={() => header.column.resetSize()}
        />
      </div>
    </>
  );
}
