import browser from 'webextension-polyfill';

import mitt from 'mitt';
import { useEffect, useRef } from 'react';

export type StorageEventPayload = Record<string, browser.Storage.StorageChange>;

type StorageEventMessage = {
  type: 'StorageEvent';
  data: StorageEventPayload;
};

type StorageAPIEvents = {
  StorageEvent: StorageEventPayload;
};

export function useBufferedEvents(isReady: boolean) {
  // Отслеживает любые изменения в хранилище и сохраняет их до момента
  // когда компонент будет готов их обработать
  const eventBusRef = useRef(mitt<StorageAPIEvents>());
  const queue = useRef<StorageEventMessage[]>([]);
  const isReadyRef = useRef(isReady);

  useEffect(() => {
    // Если компонент готов обработать события отправляем все события из хранилища
    isReadyRef.current = isReady;
    if (!isReadyRef.current || queue.current.length === 0) return;
    while (true) {
      const message = queue.current.shift();
      if (!message) break;
      eventBusRef.current.emit(message.type, message.data);
    }
  }, [isReady, queue]);

  useEffect(() => {
    // Отслеживает любые изменения в локальном хранилище
    const handleStorageChange = (
      changes: StorageEventPayload,
      areaName: string,
    ) => {
      if (areaName !== 'local') return;
      if (isReadyRef.current && queue.current.length === 0) {
        eventBusRef.current.emit('StorageEvent', changes);
      } else {
        queue.current.push({ type: 'StorageEvent', data: changes });
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  return eventBusRef.current;
}
