import { RealtimeTable, StableTable } from '@/components/data-table/DataTable';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { Activity, useEffect, useState } from 'react';

interface DynamicTableProps<TData extends Record<string, any>> {
  isRealtime: boolean;
  setIsRealtime: React.Dispatch<React.SetStateAction<boolean>>;
  switchToStable: boolean;
  setSwitchToStable: React.Dispatch<React.SetStateAction<boolean>>;
  forceRealtime?: boolean;
  columns: ColumnDef<TData>[];
  searchBy?: keyof TData;
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
  columns,
  searchBy,
  realtimeData,
  stableData,
  className,
}: DynamicTableProps<TData>) {
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
          searchBy={searchBy}
          showToolbar={false}
          resetScrollFromBottom={isRealtime}
          onScrollStart={() => {
            if (forceRealtime) return;
            setIsRealtime(false);
          }}
          onScrollEnd={(scrollFromBottom) => {
            if (forceRealtime) return;
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
          searchBy={searchBy}
          showToolbar={switchToStable}
          scrollFromBottom={scrollFromBottom}
          className={cn(className, !switchToStable && 'invisible')}
        />
      )}
    </>
  );
}
