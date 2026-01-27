import { useUpdateLogArray } from '@/app/hooks/logger/useUpdateLogArray';
import { columns } from '@/app/screens/Logger/columns';
import { DynamicTable } from '@/components/data-table/DynamicTable';
import { DataTableFeatures } from '@/components/data-table/FeaturesContext';
import { Button } from '@/components/ui/Button';
import { CheckboxWithLabel } from '@/components/ui/Checkbox';
import { cn } from '@/lib/utils';
import { TimerResetIcon } from 'lucide-react';
import { useState } from 'react';

export function Logger() {
  const [isRealtime, setIsRealtime] = useState(true);
  const [forceRealtime, setForceRealtime] = useState(false);
  const [switchToStable, setSwitchToStable] = useState(false);

  const [newestData, totalData] = useUpdateLogArray(isRealtime);

  // console.log('is realtime', isRealtime);

  return (
    <div className='grid h-screen w-full grid-cols-1 grid-rows-[auto_1fr]'>
      <div className='flex items-center gap-3 px-3 py-2 *:shrink-0'>
        <div id='toolbar' className='grid-stack w-full shrink!' />
        <Button
          variant={isRealtime ? 'outline' : 'primary'}
          onClick={() => {
            setIsRealtime(true);
            setSwitchToStable(false);
          }}
          disabled={!switchToStable}
          className={cn(
            'grid-stack border-[0.125rem] *:flex *:items-center *:gap-2',
            !isRealtime && 'border-transparent',
            isRealtime && 'disabled:cursor-default disabled:opacity-100',
          )}
        >
          <div className={cn(!isRealtime && 'invisible')}>
            <div className='mt-0.25 mr-1 size-3 animate-pulse rounded-full bg-red-700 ring-3 ring-red-700/50' />
            Realtime data
          </div>
          <div className={cn(isRealtime && 'invisible')}>
            <TimerResetIcon className='size-4' />
            Return to realtime
          </div>
        </Button>
        <CheckboxWithLabel
          checked={forceRealtime}
          onCheckedChange={setForceRealtime}
        >
          Force Realtime
        </CheckboxWithLabel>
      </div>
      <DataTableFeatures searchBy='message' allowRegex={true}>
        <DynamicTable
          isRealtime={isRealtime}
          setIsRealtime={setIsRealtime}
          switchToStable={switchToStable}
          setSwitchToStable={setSwitchToStable}
          forceRealtime={forceRealtime}
          columns={columns}
          realtimeData={newestData}
          stableData={totalData}
          className='col-start-1 row-start-2'
        />
      </DataTableFeatures>
    </div>
  );
}
