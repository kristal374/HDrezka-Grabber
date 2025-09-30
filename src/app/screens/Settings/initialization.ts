import { createDefaultSettings, getFromStorage, } from '../../../lib/storage';
import { Settings } from '../../../lib/types';

export type SettingsInitData = Required<
  Awaited<ReturnType<typeof settingsInit>>
>;

export async function settingsInit() {
  const settings = await getSettings();
  return { settings };
}

async function getSettings() {
  const settings = await getFromStorage<Settings>('settings');
  if (!settings) return await createDefaultSettings();
  return settings;
}
