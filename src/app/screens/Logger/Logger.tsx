import { useUpdateLogArray } from '@/app/hooks/logger/useUpdateLogArray';
import { columns } from '@/app/screens/Logger/columns';
import { DownloadLogsButton } from '@/app/screens/Logger/DownloadLogsButton';
import {
  UploadLogsButton,
  type UploadFileData,
} from '@/app/screens/Logger/UploadLogsButton';
import { DynamicTable } from '@/components/data-table/DynamicTable';
import { DataTableFeatures } from '@/components/data-table/FeaturesContext';
import { Button } from '@/components/ui/Button';
import { CheckboxWithLabel } from '@/components/ui/Checkbox';
import type { SetState } from '@/lib/types';
import { cn, IS_FIREFOX } from '@/lib/utils';
import { TimerResetIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { Toaster } from 'sonner';

const FORCE_REALTIME_ONLY = IS_FIREFOX;

export function Logger() {
  const [isRealtime, setIsRealtime] = useState(true);
  const [forceRealtime, setForceRealtime] = useState(FORCE_REALTIME_ONLY);
  const [switchToStable, setSwitchToStable] = useState(false);

  const [newestData, totalData, dataStore] = useUpdateLogArray(isRealtime);
  const [file, setFile] = useState<UploadFileData | null>(null);

  // console.log('is realtime', isRealtime);

  return (
    <div className='grid h-screen w-full grid-cols-1 grid-rows-[auto_1fr_auto]'>
      <div className='flex items-center gap-3 px-3 py-2 *:shrink-0'>
        <DownloadLogsButton dataStore={dataStore} />
        {!IS_FIREFOX && (
          <UploadLogsButton
            setFile={setFile}
            onFileUploaded={() => {
              setIsRealtime(false);
              setSwitchToStable(true);
            }}
          />
        )}
        <div id='toolbar' className='grid-stack w-full shrink!' />
        <div className='relative'>
          <div className={cn('flex items-center gap-3', !!file && 'invisible')}>
            <RealtimeIndicator
              isRealtime={isRealtime}
              setIsRealtime={setIsRealtime}
              switchToStable={switchToStable}
              setSwitchToStable={setSwitchToStable}
              setForceRealtime={setForceRealtime}
            />
            <CheckboxWithLabel
              checked={forceRealtime}
              onCheckedChange={setForceRealtime}
              disabled={FORCE_REALTIME_ONLY}
            >
              {browser.i18n.getMessage('logger_dataTable_forceRealtime')}
            </CheckboxWithLabel>
          </div>
          <div
            className={cn(
              'absolute inset-0 flex items-center gap-3',
              !file && 'invisible',
            )}
          >
            <p className='line-clamp-2 text-sm text-ellipsis'>
              {browser.i18n.getMessage('logger_uploadLogs_reading')}:{' '}
              <span className='font-semibold'>{file?.name}</span>
            </p>
            <Button
              variant='dangerous'
              size='square'
              onClick={() => {
                setFile(null);
                setIsRealtime(true);
                setSwitchToStable(false);
              }}
              title={browser.i18n.getMessage('logger_uploadLogs_quitFile')}
            >
              <XIcon className='size-4' />
            </Button>
          </div>
        </div>
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
          stableData={file ? file.data : totalData}
          className='col-start-1 row-start-2'
        />
      </DataTableFeatures>
      <div id='global-filter' className='w-full' />
      <Toaster
        position='bottom-right'
        expand={true}
        richColors
        duration={10_000} // ms
        theme={settings.darkMode ? 'light' : 'dark'}
      />
    </div>
  );
}

interface RealtimeIndicatorProps {
  isRealtime: boolean;
  setIsRealtime: SetState<boolean>;
  switchToStable: boolean;
  setSwitchToStable: SetState<boolean>;
  setForceRealtime: SetState<boolean>;
}

function RealtimeIndicator({
  isRealtime,
  setIsRealtime,
  switchToStable,
  setSwitchToStable,
  setForceRealtime,
}: RealtimeIndicatorProps) {
  return (
    <Button
      variant={isRealtime ? 'outline' : 'primary'}
      onClick={() => {
        if (FORCE_REALTIME_ONLY) return;
        setSwitchToStable(isRealtime);
        setIsRealtime(!isRealtime);
        setForceRealtime(false);
      }}
      disabled={!isRealtime && !switchToStable}
      className={cn(
        'grid-stack border-[0.125rem] *:flex *:items-center *:gap-2',
        !isRealtime && 'border-transparent',
      )}
    >
      <div className={cn(!isRealtime && 'invisible')}>
        <div className='mt-0.25 mr-1 size-3 animate-pulse rounded-full bg-red-700 ring-3 ring-red-700/50' />
        {browser.i18n.getMessage('logger_dataTable_isRealtime')}
      </div>
      <div className={cn(isRealtime && 'invisible')}>
        <TimerResetIcon className='size-4' />
        {browser.i18n.getMessage('logger_dataTable_backToRealtime')}
      </div>
    </Button>
  );
}
