import { doDatabaseStuff } from '@/lib/idb-storage';
import { clearDebounceTimer } from '@/lib/logger/background-logger';
import { getSettings } from '@/lib/storage';
import { EventType, Message, Settings } from '@/lib/types';
import { Runtime } from 'webextension-polyfill';

export type SettingsInitData = Required<
  Awaited<ReturnType<typeof settingsInit>>
>;

export async function settingsInit(
  setInitData: React.Dispatch<React.SetStateAction<any>>,
) {
  globalThis.settings = await getSettings();
  await setDB();

  eventBus.on(EventType.StorageChanged, async (changes, areaName) => {
    if (areaName !== 'local') return;
    for (const [key, value] of Object.entries(changes)) {
      if (key === 'settings') {
        globalThis.settings =
          (value.newValue as Settings | undefined) ?? (await getSettings());
        setInitData({ settings });
      }
    }
  });

  eventBus.setReady();
  return { settings };
}

async function setDB() {
  globalThis.indexedDBObject = await doDatabaseStuff();

  eventBus.on(
    EventType.DBDeletedMessage,
    (
      message: unknown,
      _sender: Runtime.MessageSender,
      sendResponse: (message: unknown) => void,
    ) => {
      const data = message as Message<any>;
      if (data.type !== 'DBDeleted') return;

      // Очищаем логи ожидающие записи
      clearDebounceTimer();

      doDatabaseStuff().then((db) => {
        globalThis.indexedDBObject = db;
        sendResponse(true);
      });
      return true;
    },
  );
  eventBus.on(EventType.DBDeletedEvent, async () => {
    globalThis.indexedDBObject = await doDatabaseStuff();
  });
}
