import { RealtimeTable, StableTable } from '@/components/data-table/DataTable';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { Activity, useEffect, useMemo, useState } from 'react';

interface DynamicTableProps<TData extends Record<string, any>> {
  isRealtime: boolean;
  setIsRealtime: React.Dispatch<React.SetStateAction<boolean>>;
  switchToStable: boolean;
  setSwitchToStable: React.Dispatch<React.SetStateAction<boolean>>;
  forceRealtime?: boolean;
  columns: ColumnDef<TData>[];
  realtimeData: TData[];
  stableData: TData[];
  className?: string;
}

export function DynamicTable<TData extends Record<string, any>>({
  switchToStable,
  setSwitchToStable,
  isRealtime,
  setIsRealtime,
  forceRealtime,
  columns: originalColumns,
  realtimeData,
  stableData,
  className,
}: DynamicTableProps<TData>) {
  const columns = useMemo(() => originalColumns, []);

  const [scrollFromBottom, setScrollFromBottom] = useState(0);
  useEffect(() => {
    setIsRealtime(true);
    setSwitchToStable(false);
  }, [forceRealtime]);

  useEffect(() => {
    if (isRealtime && switchToStable) setSwitchToStable(false);
  }, [isRealtime]);
  return (
    <>
      <Activity mode={switchToStable ? 'hidden' : 'visible'}>
        <RealtimeTable
          columns={columns}
          data={realtimeData}
          showToolbar={forceRealtime}
          forceRealtime={forceRealtime}
          resetScrollFromBottom={isRealtime}
          onScrollStart={() => {
            setIsRealtime(false);
          }}
          onScrollEnd={(scrollFromBottom) => {
            setSwitchToStable(true);
            setScrollFromBottom(scrollFromBottom);
          }}
          className={className}
        />
      </Activity>
      {!isRealtime && (
        <StableTable
          columns={columns}
          data={stableData}
          showToolbar={switchToStable}
          scrollFromBottom={scrollFromBottom}
          className={cn(className, !switchToStable && 'invisible')}
        />
      )}
    </>
  );
}
