export async function settingsInit() {
  return {};
}

export type SettingsInitData = Required<
  Awaited<ReturnType<typeof settingsInit>>
>;
