import { LogMessage } from '@/lib/logger';
import { IS_FIREFOX } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

export type LogMessageWithId = LogMessage & { id: number };

const NEWEST_DATA_LIMIT = IS_FIREFOX ? 500 : 100;
const REALTIME_INTERVAL = IS_FIREFOX ? 1000 : 250;

export function useUpdateLogArray(isRealtime: boolean) {
  const dataStore = useRef<LogMessageWithId[]>([]);
  const [newestData, setNewestData] = useState<LogMessageWithId[]>([]);
  const [totalData, setTotalData] = useState<LogMessageWithId[]>([]);

  useEffect(() => {
    if (!isRealtime) return;
    const readDB = async () => {
      dataStore.current = (await indexedDBObject.getAll(
        'logStorage',
      )) as LogMessageWithId[];
      setNewestData(dataStore.current.slice(-NEWEST_DATA_LIMIT));
    };

    let interval: NodeJS.Timeout;
    readDB().then(() => {
      interval = setInterval(async () => {
        const range = IDBKeyRange.lowerBound(
          dataStore.current.at(-1)?.timestamp ?? 0,
          true,
        );
        const newLogMessages = (await indexedDBObject.getAllFromIndex(
          'logStorage',
          'timestamp',
          range,
        )) as LogMessageWithId[];
        if (newLogMessages.length === 0) return;
        dataStore.current.push(...newLogMessages);
        setNewestData(dataStore.current.slice(-NEWEST_DATA_LIMIT));
      }, REALTIME_INTERVAL);
    });

    return () => {
      clearInterval(interval);
    };
  }, [isRealtime]);

  useEffect(() => {
    setTotalData(isRealtime ? [] : dataStore.current);
  }, [isRealtime]);

  return [newestData, totalData, dataStore] as const;
}
