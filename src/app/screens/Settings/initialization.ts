import { getSettings } from '@/lib/storage';
import { EventType, Settings } from '@/lib/types';

export type SettingsInitData = Required<
  Awaited<ReturnType<typeof settingsInit>>
>;

export async function settingsInit(
  setInitData: React.Dispatch<React.SetStateAction<any>>,
) {
  globalThis.settings = await getSettings();
  globalThis.permissions = await browser.permissions.getAll();

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

  const handler = async () => {
    globalThis.permissions = await browser.permissions.getAll();
    setInitData({ settings });
  };

  eventBus.on(EventType.PermissionAdded, handler);
  eventBus.on(EventType.PermissionRemoved, handler);

  eventBus.setReady();
  return { settings };
}
