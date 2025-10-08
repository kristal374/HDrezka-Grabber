import { getSettings } from '@/lib/storage';
import { EventType, Settings } from '@/lib/types';

export type SettingsInitData = Required<
  Awaited<ReturnType<typeof settingsInit>>
>;

export async function settingsInit(
  setInitData: React.Dispatch<React.SetStateAction<any>>,
) {
  globalThis.settings = await getSettings();

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
