import { getSettings } from '../../../lib/storage';
import { EventType, Settings } from '../../../lib/types';

export type SettingsInitData = Required<
  Awaited<ReturnType<typeof settingsInit>>
>;

export async function settingsInit(
  setInitData: React.Dispatch<React.SetStateAction<any>>,
) {
  const settings = await getSettings();
  globalThis.settings = settings;

  eventBus.on(EventType.StorageChanged, async (changes, areaName) => {
    if (areaName !== 'local') return;
    for (const [key, value] of Object.entries(changes)) {
      if (key === 'settings') {
        const newSettings =
          (value.newValue as Settings | undefined) ?? (await getSettings());
        globalThis.settings = newSettings;
        setInitData({ settings: newSettings });
        Object.assign(settings, newSettings);
      }
    }
  });

  eventBus.setReady();
  return { settings };
}
