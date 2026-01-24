import { LogMessage } from '@/lib/logger';
import { useEffect, useRef, useState } from 'react';

export type LogMessageWithId = LogMessage & { id: number };

export function useUpdateLogArray() {
  const dataStore = useRef<LogMessageWithId[]>([]);
  const [_revision, setRevision] = useState(0);

  useEffect(() => {
    const readDB = async () => {
      dataStore.current = (await indexedDBObject.getAll(
        'logStorage',
      )) as LogMessageWithId[];
      setRevision((prev) => prev + 1);
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
        dataStore.current.push(...newLogMessages);
        setRevision((prev) => prev + 1);
      }, 500);
    });

    return () => {
      clearInterval(interval);
    };
  }, []);

  return dataStore;
}
