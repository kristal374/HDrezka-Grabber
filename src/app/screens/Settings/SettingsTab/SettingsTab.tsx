import {
  DownloadIcon,
  FolderCogIcon,
  LucideBug,
  Monitor,
  ShieldAlert,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { Combobox } from '../../../../components/Combobox';
import { Panel } from '../../../../components/Panel';
import { Toggle } from '../../../../components/Toggle';
import { LogLevel } from '../../../../lib/types';
import { FilenameTemplateMovie } from './FilenameTemplateBuilder';
import { SettingItem, SettingsSection } from './SettingsComponets';

export type SettingItemProps<T> = {
  value: T;
  setValue: (value: T) => void;
};

export type PreviewItem = {
  value: string;
  label: string;
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
  options: PreviewItem[];
  width?: number;
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
  const [settings, setSettings] = useState({
    darkMode: true,
    displayQualitySize: true,
    getRealQuality: true,
    enableLogger: true,
    debugLevel: LogLevel.DEBUG,
    maxParallelDownloads: 5,
    maxParallelDownloadsEpisodes: 2,
    maxFallbackAttempts: 3,
    createExtensionFolders: true,
    createSeriesFolders: true,
    replaceAllSpaces: true,
    filenameTemplate: [
      '%orig_title%',
      '(',
      '%translate%',
      ')_S-',
      '%season_id%',
      '_E-',
      '%episode_id%',
      '_[',
      '%quality%',
      ']',
    ],

    actionOnNoQuality: 'reduce_quality',
    actionOnNoSubtitles: 'ignore',
    actionOnLoadError: 'skip',
  });

  const updateSetting = useCallback(function <T>(key: string, type?: 'number') {
    return (value: T) =>
      setSettings((prev) => {
        return { ...prev, [key]: type === 'number' ? Number(value) : value };
      });
  }, []);

  return (
    <Panel className='bg-settings-background-primary border-0 p-0 shadow-none'>
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
            title='Максимальное количество одновременных загрузок'
            description='Сколько файлов может загружаться одновременно'
            value={String(settings.maxParallelDownloads)}
            setValue={(value) => {
              const newValue = Number(value);
              if (settings.maxParallelDownloadsEpisodes > newValue) {
                setSettings((prev) => ({
                  ...prev,
                  maxParallelDownloadsEpisodes: newValue,
                }));
              }
              setSettings((prev) => ({
                ...prev,
                maxParallelDownloads: newValue,
              }));
            }}
            options={Array.from({ length: 32 }, (_, i) => ({
              value: String(i + 1),
              label: String(i + 1),
            }))}
            width={80}
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
            width={80}
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
            width={80}
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
          />
          <SettingsItemSelect
            title='Если не удалось загрузить серию'
            description='Что делать если произошла ошибка загрузки серии'
            value={settings.actionOnLoadError}
            setValue={updateSetting('actionOnLoadError')}
            options={[
              { value: 'skip', label: 'Пропустить серию' },
              { value: 'stop', label: 'Остановить загрузку сериала' },
            ]}
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

          <FilenameTemplateMovie
            value={settings.filenameTemplate}
            setValue={updateSetting('filenameTemplate')}
            placeholders={[
              { id: '%n%', display: 'Номер файла' },
              { id: '%movie_id%', display: 'ID фильма' },
              { id: '%title%', display: 'Название фильма' },
              { id: '%orig_title%', display: 'Оригинальное название фильма' },
              { id: '%translate%', display: 'Озвучка' },
              { id: '%translate_id%', display: 'ID озвучки' },
              { id: '%episode%', display: 'Эпизод' },
              { id: '%episode_id%', display: 'ID эпизода' },
              { id: '%season%', display: 'Сезон' },
              { id: '%season_id%', display: 'ID сезона' },
              { id: '%quality%', display: 'Качество видео' },
              { id: '%subtitle_code%', display: 'Код субтитров' },
              { id: '%subtitle_lang%', display: 'Язык субтитров' },
              { id: '%data%', display: 'Дата' },
              { id: '%time%', display: 'Время' },
            ]}
            readyTemplates={[
              [
                '%n%',
                ') ',
                '%orig_title%',
                '[',
                '%translate%',
                '] (',
                '%season%',
                ') (',
                '%episode%',
                ')',
              ],
              [
                '%orig_title%',
                '(',
                '%translate%',
                ')_S-',
                '%season_id%',
                '_E-',
                '%episode_id%',
                '_[',
                '%quality%',
                ']',
              ],
            ]}
            previews={[
              {
                label: 'Предпросмотр шаблона',
                value: '%n% - %orig_title%',
              },
              {
                label: 'Предпросмотр шаблона',
                value: '%orig_title% - %translate%',
              },
              {
                label: 'Предпросмотр шаблона',
                value: '%translate% - %season_id%',
              },
              {
                label: 'Предпросмотр шаблона',
                value: '%season_id% - %episode_id%',
              },
            ]}
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
            <SettingsItemSelect
              title='Уровень отладки'
              description='Уровень отладки расширения'
              value={String(settings.debugLevel)}
              setValue={updateSetting('debugLevel')}
              options={Object.keys(LogLevel)
                .filter((k) => isNaN(Number(k)))
                .map((level, i) => ({ value: String(i), label: level }))}
              width={125}
            />
          )}
        </SettingsSection>
      </div>
    </Panel>
  );
}
