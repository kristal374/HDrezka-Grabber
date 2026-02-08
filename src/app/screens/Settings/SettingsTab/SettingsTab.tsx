import {
  ConfirmationModal,
  confirmRequest,
} from '@/app/screens/Settings/SettingsTab/ConfirmationModal';
import {
  MOVIE_PLACEHOLDERS,
  MOVIE_PREVIEW,
  MOVIE_READY_TEMPLATES,
  SERIES_PLACEHOLDERS,
  SERIES_PREVIEW,
  SERIES_READY_TEMPLATES,
} from '@/app/screens/Settings/SettingsTab/FilenameComponentData';
import { CopyButton } from '@/components/CopyButton';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Toggle } from '@/components/ui/Toggle';
import { SettingsInitialDataContext } from '@/html/settings';
import { LogLevel } from '@/lib/logger';
import { createDefaultSettings, saveInStorage } from '@/lib/storage';
import { Message } from '@/lib/types';
import { IS_EDGE, IS_FIREFOX, IS_OPERA } from '@/lib/utils';
import {
  ChevronRightIcon,
  DownloadIcon,
  FolderCogIcon,
  LucideBug,
  MonitorIcon,
  ShieldAlertIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useCallback, useContext } from 'react';
import { toast } from 'sonner';
import { FilenameTemplateComponent } from './FilenameTemplateComponent';
import { SettingItem, SettingsSection } from './SettingsComponets';

export type SettingItemProps<T> = {
  value: T;
  setValue: (value: T) => void;
};

function SettingsItemSelect({
  title,
  description,
  value,
  setValue,
  options,
  width,
}: SettingItemProps<string> & {
  title: string;
  description: string;
  options: { value: string; label: string }[];
  width?: number | string;
}) {
  return (
    <SettingItem title={title} description={description}>
      <Combobox
        value={value}
        onValueChange={setValue}
        data={options}
        width={width}
        needSearch={false}
        showChevron={true}
      />
    </SettingItem>
  );
}

function SettingsItemToggle({
  title,
  description,
  value,
  setValue,
}: SettingItemProps<boolean> & {
  title: string;
  description: string;
}) {
  return (
    <SettingItem title={title} description={description}>
      <Toggle checked={value} onChange={setValue} />
    </SettingItem>
  );
}

export function SettingsTab() {
  const { settings } = useContext(SettingsInitialDataContext)!;
  const updateSetting = useCallback(
    function <T>(key: string, type?: 'number') {
      return (value: T) => {
        const newValue = {
          ...settings,
          [key]: type === 'number' ? Number(value) : value,
        };
        saveInStorage('settings', newValue);
      };
    },
    [settings],
  );

  const notificationPromise = useCallback(
    async (promise: Promise<any>, notification: string) => {
      return toast.promise(promise, {
        loading: browser.i18n.getMessage('settings_toast_process'),
        success: () => notification,
        error: (e) => {
          console.error(e);
          return browser.i18n.getMessage('settings_toast_errorProcess');
        },
      });
    },
    [],
  );

  const requestPermission = useCallback(
    async ({
      title,
      description,
      onConfirm,
      notificationText,
    }: {
      title: string;
      description?: string;
      onConfirm: () => Promise<any>;
      notificationText?: string;
    }) => {
      const result = await confirmRequest({ title, description });

      if (result) {
        const process = onConfirm();
        if (notificationText) {
          await notificationPromise(process, notificationText);
        } else {
          await process;
        }
      }
    },
    [],
  );

  const handleRestoreState = useCallback(async () => {
    const process = browser.runtime.sendMessage<Message<boolean>>({
      type: 'requestToRestoreState',
      message: true,
    });
    await notificationPromise(
      process,
      browser.i18n.getMessage('settings_restoreInsideState_notification'),
    );
  }, []);

  const handleClearCache = useCallback(async () => {
    await browser.runtime.sendMessage<Message<undefined>>({
      type: 'clearCache',
      message: undefined,
    });
    await browser.storage.session.clear();
  }, []);

  const handleStopAllDownloads = useCallback(async () => {
    await browser.runtime.sendMessage<Message<undefined>>({
      type: 'stopAllDownloads',
      message: undefined,
    });
  }, []);

  const handleClearDownloadHistory = useCallback(async () => {
    await browser.runtime.sendMessage<Message<undefined>>({
      type: 'stopAllDownloads',
      message: undefined,
    });
    const tx = indexedDBObject.transaction(
      ['urlDetail', 'loadConfig', 'loadStorage', 'fileStorage'],
      'readwrite',
    );
    await Promise.all([
      tx.objectStore('urlDetail').clear(),
      tx.objectStore('loadConfig').clear(),
      tx.objectStore('loadStorage').clear(),
      tx.objectStore('fileStorage').clear(),
    ]);
    await tx.done;
  }, []);

  const handleRemoveExtensionData = useCallback(async () => {
    await browser.runtime.sendMessage<Message<undefined>>({
      type: 'deleteExtensionData',
      message: undefined,
    });
  }, []);

  const afterInstallSettingName = IS_FIREFOX
    ? browser.i18n.getMessage('settings_itemAfterInstall_firefox')
    : IS_EDGE
      ? browser.i18n.getMessage('settings_itemAfterInstall_edge')
      : IS_OPERA
        ? browser.i18n.getMessage('settings_itemAfterInstall_opera')
        : browser.i18n.getMessage('settings_itemAfterInstall_chrome');

  return (
    <Panel className='bg-settings-background-primary border-0 p-0 shadow-none'>
      <ConfirmationModal />
      <div className='flex flex-col gap-12'>
        {!settings.afterInstallDismissed && (
          <SettingsSection
            title={browser.i18n.getMessage('settings_sectionAfterInstall')}
            icon={TriangleAlertIcon}
            className='to-error light:to-rose-200 border-rose-400 bg-linear-to-r from-transparent from-40%'
          >
            <SettingItem
              title={browser.i18n.getMessage('settings_itemAfterInstall_title')}
              description={browser.i18n.getMessage(
                'settings_itemAfterInstall_description',
              )}
            >
              <Button
                variant='dangerous'
                onClick={() => {
                  updateSetting('afterInstallDismissed')(true);
                }}
              >
                {browser.i18n.getMessage('settings_itemAfterInstall_button')}
              </Button>
            </SettingItem>
            <SettingItem
              title={browser.i18n.getMessage(
                'settings_itemAfterInstall_disableTitle',
              )}
              footer={
                <div className='-ml-2 flex flex-wrap items-center gap-y-1'>
                  <CopyButton
                    variant='ghost'
                    content={
                      IS_FIREFOX
                        ? 'about:preferences#general'
                        : 'chrome://settings/downloads'
                    }
                    noIcon={true}
                    className='px-2 text-xs'
                  >
                    <span>
                      {browser.i18n.getMessage(
                        'settings_itemAfterInstall_settingsBrowser',
                      )}
                    </span>
                    <ChevronRightIcon className='size-4' />
                    <span>
                      {browser.i18n.getMessage(
                        'settings_itemAfterInstall_settingsDownload',
                      )}
                    </span>
                  </CopyButton>
                  <ChevronRightIcon className='size-4' />
                  <div className='flex flex-wrap items-center gap-y-1'>
                    <div className='flex items-center'>
                      <CopyButton
                        variant='ghost'
                        content={afterInstallSettingName}
                        noIcon={true}
                        className='px-2 text-xs'
                      >
                        <span>{afterInstallSettingName}</span>
                      </CopyButton>
                      <ChevronRightIcon className='size-4' />
                    </div>
                    <span className='px-2 pt-1.25 pb-1.5 text-xs font-medium select-none'>
                      {browser.i18n.getMessage(
                        'settings_itemAfterInstall_settingsDisable',
                      )}
                    </span>
                  </div>
                </div>
              }
            >
              <></>
            </SettingItem>
          </SettingsSection>
        )}

        <SettingsSection
          title={browser.i18n.getMessage('settings_sectionInterface')}
          icon={MonitorIcon}
        >
          <SettingsItemToggle
            title={browser.i18n.getMessage('settings_itemInterfaceTheme_title')}
            description={browser.i18n.getMessage(
              'settings_itemInterfaceTheme_description',
            )}
            value={settings.darkMode}
            setValue={updateSetting('darkMode')}
          />

          <SettingsItemToggle
            title={browser.i18n.getMessage('settings_itemDisplaySize_title')}
            description={browser.i18n.getMessage(
              'settings_itemDisplaySize_description',
            )}
            value={settings.displayQualitySize}
            setValue={updateSetting('displayQualitySize')}
          />

          <SettingsItemToggle
            title={browser.i18n.getMessage('settings_itemGetRealQuality_title')}
            description={browser.i18n.getMessage(
              'settings_itemGetRealQuality_description',
            )}
            value={settings.getRealQuality}
            setValue={updateSetting('getRealQuality')}
          />
        </SettingsSection>

        <SettingsSection
          title={browser.i18n.getMessage('settings_sectionDownloadBehavior')}
          icon={DownloadIcon}
        >
          <SettingsItemSelect
            title={browser.i18n.getMessage(
              'settings_itemFileTypePriority_title',
            )}
            description={browser.i18n.getMessage(
              'settings_itemFileTypePriority_description',
            )}
            value={settings.fileTypePriority}
            setValue={updateSetting('fileTypePriority')}
            options={[
              {
                value: 'video',
                label: browser.i18n.getMessage('settings_valueVideo'),
              },
              {
                value: 'subtitle',
                label: browser.i18n.getMessage('settings_valueSubtitle'),
              },
            ]}
            width='8rem'
          />
          <SettingsItemSelect
            title={browser.i18n.getMessage(
              'settings_itemMaxParallelDownloads_title',
            )}
            description={browser.i18n.getMessage(
              'settings_itemMaxParallelDownloads_description',
            )}
            value={String(settings.maxParallelDownloads)}
            setValue={(value) => {
              const newValue = Number(value);
              if (settings.maxParallelDownloadsEpisodes > newValue) {
                saveInStorage('settings', {
                  ...settings,
                  maxParallelDownloadsEpisodes: newValue,
                  maxParallelDownloads: newValue,
                });
              } else {
                saveInStorage('settings', {
                  ...settings,
                  maxParallelDownloads: newValue,
                });
              }
            }}
            options={Array.from({ length: 32 }, (_, i) => ({
              value: String(i + 1),
              label: String(i + 1),
            }))}
            width='5rem'
          />

          <SettingsItemSelect
            title={browser.i18n.getMessage(
              'settings_itemMaxParallelDownloadsEpisodes_title',
            )}
            description={browser.i18n.getMessage(
              'settings_itemMaxParallelDownloadsEpisodes_description',
            )}
            value={String(settings.maxParallelDownloadsEpisodes)}
            setValue={updateSetting('maxParallelDownloadsEpisodes', 'number')}
            options={Array.from(
              { length: settings.maxParallelDownloads },
              (_, i) => ({
                value: String(i + 1),
                label: String(i + 1),
              }),
            )}
            width='5rem'
          />

          <SettingsItemSelect
            title={browser.i18n.getMessage(
              'settings_itemMaxFallbackAttempts_title',
            )}
            description={browser.i18n.getMessage(
              'settings_itemMaxFallbackAttempts_description',
            )}
            value={String(settings.maxFallbackAttempts)}
            setValue={updateSetting('maxFallbackAttempts', 'number')}
            options={Array.from({ length: 10 }, (_, i) => ({
              value: String(i + 1),
              label: String(i + 1),
            }))}
            width='5rem'
          />

          <SettingsItemSelect
            title={browser.i18n.getMessage(
              'settings_itemTimeBetweenDownloadAttempts_title',
            )}
            description={browser.i18n.getMessage(
              'settings_itemTimeBetweenDownloadAttempts_description',
            )}
            value={String(settings.timeBetweenDownloadAttempts)}
            setValue={updateSetting('timeBetweenDownloadAttempts', 'number')}
            options={[
              {
                value: String(1000),
                label: browser.i18n.getMessage('time_1s'),
              },
              {
                value: String(5 * 1000),
                label: browser.i18n.getMessage('time_5s'),
              },
              {
                value: String(10 * 1000),
                label: browser.i18n.getMessage('time_10s'),
              },
              {
                value: String(15 * 1000),
                label: browser.i18n.getMessage('time_15s'),
              },
              {
                value: String(30 * 1000),
                label: browser.i18n.getMessage('time_30s'),
              },
              {
                value: String(60 * 1000),
                label: browser.i18n.getMessage('time_1m'),
              },
              {
                value: String(2 * 60 * 1000),
                label: browser.i18n.getMessage('time_2m'),
              },
              {
                value: String(5 * 60 * 1000),
                label: browser.i18n.getMessage('time_5m'),
              },
              {
                value: String(10 * 60 * 1000),
                label: browser.i18n.getMessage('time_10m'),
              },
              {
                value: String(15 * 60 * 1000),
                label: browser.i18n.getMessage('time_15m'),
              },
            ]}
            width='8rem'
          />

          <SettingsItemSelect
            title={browser.i18n.getMessage(
              'settings_itemDownloadStartTimeLimit_title',
            )}
            description={browser.i18n.getMessage(
              'settings_itemDownloadStartTimeLimit_description',
            )}
            value={String(settings.downloadStartTimeLimit)}
            setValue={updateSetting('downloadStartTimeLimit', 'number')}
            // Лимит времени обусловлен временем жизни неактивного service-worker-а.
            // https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
            options={[
              {
                value: String(5 * 1000),
                label: browser.i18n.getMessage('time_5s'),
              },
              {
                value: String(10 * 1000),
                label: browser.i18n.getMessage('time_10s'),
              },
              {
                value: String(15 * 1000),
                label: browser.i18n.getMessage('time_15s'),
              },
              {
                value: String(20 * 1000),
                label: browser.i18n.getMessage('time_20s'),
              },
              {
                value: String(25 * 1000),
                label: browser.i18n.getMessage('time_25s'),
              },
            ]}
            width='8rem'
          />
        </SettingsSection>

        <SettingsSection
          title={browser.i18n.getMessage('settings_sectionFailureActions')}
          icon={ShieldAlertIcon}
        >
          <SettingsItemSelect
            title={browser.i18n.getMessage(
              'settings_itemActionOnNoQuality_title',
            )}
            description={browser.i18n.getMessage(
              'settings_itemActionOnNoQuality_description',
            )}
            value={settings.actionOnNoQuality}
            setValue={updateSetting('actionOnNoQuality')}
            options={[
              {
                value: 'skip',
                label: browser.i18n.getMessage('settings_valueSkipEpisode'),
              },
              {
                value: 'reduce_quality',
                label: browser.i18n.getMessage('settings_valueReduceQuality'),
              },
              {
                value: 'stop',
                label: browser.i18n.getMessage('settings_valueStopDownload'),
              },
            ]}
            width='14.5rem'
          />
          <SettingsItemSelect
            title={browser.i18n.getMessage(
              'settings_itemActionOnNoSubtitles_title',
            )}
            description={browser.i18n.getMessage(
              'settings_itemActionOnNoSubtitles_description',
            )}
            value={settings.actionOnNoSubtitles}
            setValue={updateSetting('actionOnNoSubtitles')}
            options={[
              {
                value: 'skip',
                label: browser.i18n.getMessage('settings_valueSkipEpisode'),
              },
              {
                value: 'ignore',
                label: browser.i18n.getMessage('settings_valueIgnoreSubtitle'),
              },
              {
                value: 'stop',
                label: browser.i18n.getMessage('settings_valueStopDownload'),
              },
            ]}
            width='14.5rem'
          />
          <SettingsItemSelect
            title={browser.i18n.getMessage(
              'settings_itemActionOnLoadSubtitleError_title',
            )}
            description={browser.i18n.getMessage(
              'settings_itemActionOnLoadSubtitleError_description',
            )}
            value={settings.actionOnLoadSubtitleError}
            setValue={updateSetting('actionOnLoadSubtitleError')}
            options={[
              {
                value: 'skip',
                label: browser.i18n.getMessage(
                  'settings_valueSkipThisSubtitle',
                ),
              },
              {
                value: 'stop',
                label: browser.i18n.getMessage('settings_valueStopDownload'),
              },
            ]}
            width='14.5rem'
          />
          <SettingsItemSelect
            title={browser.i18n.getMessage(
              'settings_itemActionOnLoadVideoError_title',
            )}
            description={browser.i18n.getMessage(
              'settings_itemActionOnLoadVideoError_description',
            )}
            value={settings.actionOnLoadVideoError}
            setValue={updateSetting('actionOnLoadError')}
            options={[
              {
                value: 'skip',
                label: browser.i18n.getMessage('settings_valueSkipThisEpisode'),
              },
              {
                value: 'stop',
                label: browser.i18n.getMessage('settings_valueStopDownload'),
              },
            ]}
            width='14.5rem'
          />
        </SettingsSection>

        <SettingsSection
          title={browser.i18n.getMessage('settings_sectionFilenameTemplate')}
          icon={FolderCogIcon}
        >
          <SettingsItemToggle
            title={browser.i18n.getMessage(
              'settings_itemCreateExtensionFolders_title',
            )}
            description={browser.i18n.getMessage(
              'settings_itemCreateExtensionFolders_description',
            )}
            value={settings.createExtensionFolders}
            setValue={updateSetting('createExtensionFolders')}
          />

          <SettingsItemToggle
            title={browser.i18n.getMessage(
              'settings_itemCreateSeriesFolders_title',
            )}
            description={browser.i18n.getMessage(
              'settings_itemCreateSeriesFolders_description',
            )}
            value={settings.createSeriesFolders}
            setValue={updateSetting('createSeriesFolders')}
          />

          <SettingsItemToggle
            title={browser.i18n.getMessage(
              'settings_itemReplaceAllSpaces_title',
            )}
            description={browser.i18n.getMessage(
              'settings_itemReplaceAllSpaces_description',
            )}
            value={settings.replaceAllSpaces}
            setValue={updateSetting('replaceAllSpaces')}
          />

          <FilenameTemplateComponent
            fieldId={'movie-template-editor'}
            value={settings.filenameFilmTemplate}
            setValue={updateSetting('filenameFilmTemplate')}
            title={browser.i18n.getMessage('settings_filenameFilms')}
            placeholders={MOVIE_PLACEHOLDERS}
            readyTemplates={MOVIE_READY_TEMPLATES}
            previews={MOVIE_PREVIEW}
          />

          <FilenameTemplateComponent
            fieldId={'series-template-editor'}
            value={settings.filenameSeriesTemplate}
            setValue={updateSetting('filenameSeriesTemplate')}
            title={browser.i18n.getMessage('settings_filenameSeries')}
            placeholders={SERIES_PLACEHOLDERS}
            readyTemplates={SERIES_READY_TEMPLATES}
            previews={SERIES_PREVIEW}
          />
        </SettingsSection>

        <SettingsSection
          title={browser.i18n.getMessage('settings_sectionDebug')}
          icon={LucideBug}
        >
          <SettingsItemToggle
            title={browser.i18n.getMessage('settings_itemEnableLogger_title')}
            description={browser.i18n.getMessage(
              'settings_itemEnableLogger_description',
            )}
            value={settings.enableLogger}
            setValue={updateSetting('enableLogger')}
          />

          {settings.enableLogger && (
            <>
              <SettingsItemSelect
                title={browser.i18n.getMessage('settings_itemDebugLevel_title')}
                description={browser.i18n.getMessage(
                  'settings_itemDebugLevel_description',
                )}
                value={String(settings.debugLevel)}
                setValue={updateSetting('debugLevel')}
                options={Object.keys(LogLevel)
                  .filter((k) => isNaN(Number(k)))
                  .map((level, i) => ({ value: String(i), label: level }))}
                width='8rem'
              />

              <SettingsItemSelect
                title={browser.i18n.getMessage(
                  'settings_itemLogMessageLifetime_title',
                )}
                description={browser.i18n.getMessage(
                  'settings_itemLogMessageLifetime_description',
                )}
                value={String(settings.logMessageLifetime)}
                setValue={updateSetting('logMessageLifetime', 'number')}
                options={[
                  {
                    value: String(60 * 1000),
                    label: browser.i18n.getMessage('time_1m'),
                  },
                  {
                    value: String(2 * 60 * 1000),
                    label: browser.i18n.getMessage('time_2m'),
                  },
                  {
                    value: String(5 * 60 * 1000),
                    label: browser.i18n.getMessage('time_5m'),
                  },
                  {
                    value: String(10 * 60 * 1000),
                    label: browser.i18n.getMessage('time_10m'),
                  },
                  {
                    value: String(30 * 60 * 1000),
                    label: browser.i18n.getMessage('time_30m'),
                  },
                  {
                    value: String(60 * 60 * 1000),
                    label: browser.i18n.getMessage('time_1h'),
                  },
                  {
                    value: String(2 * 60 * 60 * 1000),
                    label: browser.i18n.getMessage('time_2h'),
                  },
                  {
                    value: String(5 * 60 * 60 * 1000),
                    label: browser.i18n.getMessage('time_5h'),
                  },
                  {
                    value: String(12 * 60 * 60 * 1000),
                    label: browser.i18n.getMessage('time_12h'),
                  },
                  {
                    value: String(24 * 60 * 60 * 1000),
                    label: browser.i18n.getMessage('time_1d'),
                  },
                  {
                    value: String(2 * 24 * 60 * 60 * 1000),
                    label: browser.i18n.getMessage('time_2d'),
                  },
                  {
                    value: String(7 * 24 * 60 * 60 * 1000),
                    label: browser.i18n.getMessage('time_1w'),
                  },
                  {
                    value: String(2 * 7 * 24 * 60 * 60 * 1000),
                    label: browser.i18n.getMessage('time_2w'),
                  },
                ]}
                width='8rem'
              />
            </>
          )}

          {!IS_FIREFOX && (
            <SettingsItemToggle
              title={browser.i18n.getMessage(
                'settings_itemTrackEventsOnDeterminingFilename_title',
              )}
              description={browser.i18n.getMessage(
                'settings_itemTrackEventsOnDeterminingFilename_description',
              )}
              value={settings.trackEventsOnDeterminingFilename}
              setValue={updateSetting('trackEventsOnDeterminingFilename')}
            />
          )}

          <hr className='border-settings-border-primary border-t' />

          <div className='flex flex-wrap gap-3'>
            <Button onClick={handleRestoreState}>
              {browser.i18n.getMessage('settings_restoreInsideState')}
            </Button>

            <Button
              onClick={() => {
                requestPermission({
                  title: browser.i18n.getMessage(
                    'settings_restoreSettings_title',
                  ),
                  onConfirm: createDefaultSettings,
                  notificationText: browser.i18n.getMessage(
                    'settings_restoreSettings_notification',
                  ),
                });
              }}
            >
              {browser.i18n.getMessage('settings_restoreSettings')}
            </Button>

            <Button
              onClick={() => {
                requestPermission({
                  title: browser.i18n.getMessage('settings_clearCache_title'),
                  onConfirm: handleClearCache,
                  notificationText: browser.i18n.getMessage(
                    'settings_clearCache_notification',
                  ),
                });
              }}
            >
              {browser.i18n.getMessage('settings_clearCache')}
            </Button>

            <Button
              onClick={() => {
                requestPermission({
                  title: browser.i18n.getMessage(
                    'settings_stopAllDownloads_title',
                  ),
                  onConfirm: handleStopAllDownloads,
                  notificationText: browser.i18n.getMessage(
                    'settings_stopAllDownloads_notification',
                  ),
                });
              }}
            >
              {browser.i18n.getMessage('settings_stopAllDownloads')}
            </Button>

            <Button
              onClick={() => {
                requestPermission({
                  title: browser.i18n.getMessage(
                    'settings_clearDownloadHistory_title',
                  ),
                  description: browser.i18n.getMessage(
                    'settings_clearDownloadHistory_description',
                  ),
                  onConfirm: handleClearDownloadHistory,
                  notificationText: browser.i18n.getMessage(
                    'settings_clearDownloadHistory_notification',
                  ),
                });
              }}
            >
              {browser.i18n.getMessage('settings_clearDownloadHistory')}
            </Button>

            <Button
              onClick={() => {
                requestPermission({
                  title: browser.i18n.getMessage(
                    'settings_removeAllExtensionData_title',
                  ),
                  description: browser.i18n.getMessage(
                    'settings_removeAllExtensionData_description',
                  ),
                  onConfirm: handleRemoveExtensionData,
                  notificationText: browser.i18n.getMessage(
                    'settings_removeAllExtensionData_notification',
                  ),
                });
              }}
            >
              {browser.i18n.getMessage('settings_removeAllExtensionData')}
            </Button>
          </div>
        </SettingsSection>
      </div>
    </Panel>
  );
}
