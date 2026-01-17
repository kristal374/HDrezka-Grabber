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
import { Panel } from '@/components/Panel';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Toggle } from '@/components/ui/Toggle';
import { dropDatabase } from '@/lib/idb-storage';
import { LogLevel } from '@/lib/logger/types';
import { createDefaultSettings, saveInStorage } from '@/lib/storage';
import { EventType, Message } from '@/lib/types';
import {
  DownloadIcon,
  FolderCogIcon,
  LucideBug,
  Monitor,
  ShieldAlert,
} from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { FilenameTemplateComponent } from './FilenameTemplateComponent';
import { SettingItem, SettingsSection } from './SettingsComponets';

const isFirefox = typeof browser.runtime.getBrowserInfo === 'function';

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
  const updateSetting = useCallback(function <T>(key: string, type?: 'number') {
    return (value: T) => {
      const newValue = {
        ...settings,
        [key]: type === 'number' ? Number(value) : value,
      };
      saveInStorage('settings', newValue);
    };
  }, []);

  const notificationPromise = useCallback(
    async (promise: Promise<any>, notification: string) => {
      return toast.promise(promise, {
        loading: 'В обработке...',
        success: () => notification,
        error: (e) => {
          console.error(e);
          return 'Произошёл сбой.';
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
      'Завершена попытка восстановить работу расширения.',
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
      type: 'stopAllDownloads',
      message: undefined,
    });

    // Ждём 3 секунды чтоб усели обработаться все события
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await browser.storage.local.clear();
    await browser.storage.sync.clear();
    await browser.storage.session.clear();

    await dropDatabase();
    await browser.runtime.sendMessage<Message<undefined>>({
      type: 'DBDeleted',
      message: undefined,
    });
    globalThis.dispatchEvent(new CustomEvent(EventType.DBDeletedEvent));
    // browser.runtime.reload()
  }, []);

  return (
    <Panel className='bg-settings-background-primary border-0 p-0 shadow-none'>
      <ConfirmationModal />
      <div className='flex flex-col gap-12'>
        <SettingsSection title='Настройки интерфейса' icon={Monitor}>
          <SettingsItemToggle
            title='Темная тема'
            description='Использовать темное оформление интерфейса'
            value={settings.darkMode}
            setValue={updateSetting('darkMode')}
          />

          <SettingsItemToggle
            title='Отображать в попапе размер качества'
            description='Расширение будет получать размер файла, который будет отображаться в попапе напротив качества'
            value={settings.displayQualitySize}
            setValue={updateSetting('displayQualitySize')}
          />

          <SettingsItemToggle
            title='Определять реальное качество видео'
            description='Расширение будет определять реальное разрешение видео если сервер попытается подменить качество более низким'
            value={settings.getRealQuality}
            setValue={updateSetting('getRealQuality')}
          />
        </SettingsSection>

        <SettingsSection title='Поведение при загрузке' icon={DownloadIcon}>
          <SettingsItemSelect
            title='Приоритет загрузки'
            description='Что стоит загружать первым: видео или субтитры'
            value={settings.fileTypePriority}
            setValue={updateSetting('fileTypePriority')}
            options={[
              { value: 'video', label: 'Видео' },
              { value: 'subtitle', label: 'Субтитры' },
            ]}
            width='8rem'
          />
          <SettingsItemSelect
            title='Максимальное количество одновременных загрузок'
            description='Сколько файлов может загружаться одновременно'
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
            title='Максимальное количество одновременно загружаемых серий одного сериала'
            description='Сколько серий одного сериала сможет загружаться одновременно, позволяет загружать одновременно несколько сериалов'
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
            title='Максимальное количество попыток загрузки файла'
            description='Максимальное количество попыток загрузки файла перед тем как загрузка будет считаться неудачной'
            value={String(settings.maxFallbackAttempts)}
            setValue={updateSetting('maxFallbackAttempts', 'number')}
            options={Array.from({ length: 10 }, (_, i) => ({
              value: String(i + 1),
              label: String(i + 1),
            }))}
            width='5rem'
          />

          <SettingsItemSelect
            title='Время между попытками загрузки'
            description='Сколько ждать перед тем как снова попытаться загрузить файл'
            value={String(settings.timeBetweenDownloadAttempts)}
            setValue={updateSetting('timeBetweenDownloadAttempts', 'number')}
            options={[
              { value: String(1000), label: '1 секунда' },
              { value: String(5 * 1000), label: '5 секунд' },
              { value: String(10 * 1000), label: '10 секунд' },
              { value: String(15 * 1000), label: '15 секунд' },
              { value: String(30 * 1000), label: '30 секунд' },
              { value: String(60 * 1000), label: '1 минута' },
              { value: String(2 * 60 * 1000), label: '2 минуты' },
              { value: String(5 * 60 * 1000), label: '5 минут' },
              { value: String(10 * 60 * 1000), label: '10 минут' },
              { value: String(15 * 60 * 1000), label: '15 минут' },
            ]}
            width='8rem'
          />

          <SettingsItemSelect
            title='Максимальное время, отведенное для начала загрузки'
            description='Через какой период времени запуск загрузки будет считаться неудачным, если загрузка не стартовала.'
            value={String(settings.downloadStartTimeLimit)}
            setValue={updateSetting('downloadStartTimeLimit', 'number')}
            // Лимит времени обусловлен временем жизни неактивного service-worker-а.
            // https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
            options={[
              { value: String(5 * 1000), label: '5 секунд' },
              { value: String(10 * 1000), label: '10 секунд' },
              { value: String(15 * 1000), label: '15 секунд' },
              { value: String(20 * 1000), label: '20 секунд' },
              { value: String(25 * 1000), label: '25 секунд' },
            ]}
            width='8rem'
          />
        </SettingsSection>

        <SettingsSection title='Действия при сбоях' icon={ShieldAlert}>
          <SettingsItemSelect
            title='Если при загрузки серии нет выбраного качества'
            description='Что делать если у некоторых серий в сериале нет выбранного качества'
            value={settings.actionOnNoQuality}
            setValue={updateSetting('actionOnNoQuality')}
            options={[
              { value: 'skip', label: 'Пропустить серию' },
              { value: 'reduce_quality', label: 'Понизить качество серии' },
              { value: 'stop', label: 'Остановить загрузку сериала' },
            ]}
            width='14.5rem'
          />
          <SettingsItemSelect
            title='Если при загрузки серии нет выбраных субтитров'
            description='Что делать если у некоторых серий в сериале нет выбранных субтитров'
            value={settings.actionOnNoSubtitles}
            setValue={updateSetting('actionOnNoSubtitles')}
            options={[
              { value: 'skip', label: 'Пропустить серию' },
              { value: 'ignore', label: 'Игнорировать' },
              { value: 'stop', label: 'Остановить загрузку сериала' },
            ]}
            width='14.5rem'
          />
          <SettingsItemSelect
            title='Если не удалось загрузить субтитры'
            description='Что делать если произошёл сбой при загрузки субтитров во время загрузки серии'
            value={settings.actionOnLoadSubtitleError}
            setValue={updateSetting('actionOnLoadSubtitleError')}
            options={[
              { value: 'skip', label: 'Пропустить эти субтитры' },
              { value: 'stop', label: 'Остановить загрузку сериала' },
            ]}
            width='14.5rem'
          />
          <SettingsItemSelect
            title='Если не удалось загрузить серию'
            description='Что делать если произошла ошибка загрузки серии'
            value={settings.actionOnLoadVideoError}
            setValue={updateSetting('actionOnLoadError')}
            options={[
              { value: 'skip', label: 'Пропустить эту серию' },
              { value: 'stop', label: 'Остановить загрузку сериала' },
            ]}
            width='14.5rem'
          />
        </SettingsSection>

        <SettingsSection
          title='Настройки именования файлов'
          icon={FolderCogIcon}
        >
          <SettingsItemToggle
            title='Создать папку расширения в папке загрузок'
            description='В папке загрузок будет создана новая папка "HDrezkaGrabber", в которую будут сохраняться все загруженные файлы'
            value={settings.createExtensionFolders}
            setValue={updateSetting('createExtensionFolders')}
          />

          <SettingsItemToggle
            title='Создавать отдельную папку для каждого сериала'
            description='Для каждого сериала будет создана отдельная папка с именем сериала'
            value={settings.createSeriesFolders}
            setValue={updateSetting('createSeriesFolders')}
          />

          <SettingsItemToggle
            title='Заменять все пробелы на нижние подчёркивания (рекомендуется)'
            description='Все пробелы в имени файла будут заменены на нижние подчёркивания'
            value={settings.replaceAllSpaces}
            setValue={updateSetting('replaceAllSpaces')}
          />

          <FilenameTemplateComponent
            fieldId={'movie-template-editor'}
            value={settings.filenameFilmTemplate}
            setValue={updateSetting('filenameFilmTemplate')}
            title='Шаблон имени файлов для фильмов'
            placeholders={MOVIE_PLACEHOLDERS}
            readyTemplates={MOVIE_READY_TEMPLATES}
            previews={MOVIE_PREVIEW}
          />

          <FilenameTemplateComponent
            fieldId={'series-template-editor'}
            value={settings.filenameSeriesTemplate}
            setValue={updateSetting('filenameSeriesTemplate')}
            title='Шаблон имени файлов для сериалов'
            placeholders={SERIES_PLACEHOLDERS}
            readyTemplates={SERIES_READY_TEMPLATES}
            previews={SERIES_PREVIEW}
          />
        </SettingsSection>

        <SettingsSection title='Отладка расширения' icon={LucideBug}>
          <SettingsItemToggle
            title='Включить логирование'
            description='Включить логирование в консоль'
            value={settings.enableLogger}
            setValue={updateSetting('enableLogger')}
          />

          {settings.enableLogger && (
            <>
              <SettingsItemSelect
                title='Уровень отладки'
                description='Уровень логирования расширения'
                value={String(settings.debugLevel)}
                setValue={updateSetting('debugLevel')}
                options={Object.keys(LogLevel)
                  .filter((k) => isNaN(Number(k)))
                  .map((level, i) => ({ value: String(i), label: level }))}
                width='8rem'
              />

              <SettingsItemSelect
                title='Время жизни сообщения в журнале'
                description='Через сколько будет удалено лог сообщение из хранилища'
                value={String(settings.logMessageLifetime)}
                setValue={updateSetting('logMessageLifetime', 'number')}
                options={[
                  { value: String(60 * 1000), label: '1 минута' },
                  { value: String(2 * 60 * 1000), label: '2 минуты' },
                  { value: String(5 * 60 * 1000), label: '5 минут' },
                  { value: String(10 * 60 * 1000), label: '10 минут' },
                  { value: String(30 * 60 * 1000), label: '30 минут' },
                  { value: String(60 * 60 * 1000), label: '1 час' },
                  { value: String(2 * 60 * 60 * 1000), label: '2 часа' },
                  { value: String(5 * 60 * 60 * 1000), label: '5 часов' },
                  { value: String(12 * 60 * 60 * 1000), label: '12 часов' },
                  { value: String(24 * 60 * 60 * 1000), label: '1 день' },
                  { value: String(2 * 24 * 60 * 60 * 1000), label: '2 дня' },
                  { value: String(7 * 24 * 60 * 60 * 1000), label: '1 неделя' },
                  {
                    value: String(2 * 7 * 24 * 60 * 60 * 1000),
                    label: '2 недели',
                  },
                ]}
                width='8rem'
              />
            </>
          )}

          {!isFirefox && (
            <SettingsItemToggle
              title='Отслеживать события на именование файла onDeterminingFilename'
              description='Не изменяйте если у вас всё работает хорошо! Может помочь если есть другое расширение которое так же отслеживает события на именование фалов из-за чего возникает конфликт и файлы при загрузке имеют некорректные названия.'
              value={settings.trackEventsOnDeterminingFilename}
              setValue={updateSetting('trackEventsOnDeterminingFilename')}
            />
          )}

          <hr className='border-settings-border-primary border-t' />

          <div className='flex flex-wrap gap-3'>
            <Button onClick={handleRestoreState}>
              Попытаться восстановить работу расширения
            </Button>

            <Button
              onClick={() => {
                requestPermission({
                  title: 'Восстановить настройки по умолчанию?',
                  onConfirm: createDefaultSettings,
                  notificationText: 'Настройки сброшены!',
                });
              }}
            >
              Восстановить настройки по умолчанию
            </Button>

            <Button
              onClick={() => {
                requestPermission({
                  title: 'Очистить кэш расширения?',
                  onConfirm: handleClearCache,
                  notificationText: 'Кэш очищен!',
                });
              }}
            >
              Очистить кэш
            </Button>

            <Button
              onClick={() => {
                requestPermission({
                  title: 'Прервать активные загрузки и очистить очередь?',
                  onConfirm: handleStopAllDownloads,
                  notificationText: 'Загрузки остановлены!',
                });
              }}
            >
              Остановить все загрузки
            </Button>

            <Button
              onClick={() => {
                requestPermission({
                  title:
                    'Вы действительно хотите очистить историю загрузок расширения?',
                  description:
                    'Все текущие загрузки будут прерваны. Это действие невозможно будет отменить позже.',
                  onConfirm: handleClearDownloadHistory,
                  notificationText: 'История загрузок очищена!',
                });
              }}
            >
              Очистить историю загрузок
            </Button>

            <Button
              onClick={() => {
                requestPermission({
                  title:
                    'Вы действительно хотите удалить все данные расширения?',
                  description:
                    'Все текущие загрузки будут прерваны. Это действие невозможно будет отменить позже.',
                  onConfirm: handleRemoveExtensionData,
                  notificationText: 'Данные расширения удалены!',
                });
              }}
            >
              Удалить все данные расширения
            </Button>
          </div>
        </SettingsSection>
      </div>
    </Panel>
  );
}
