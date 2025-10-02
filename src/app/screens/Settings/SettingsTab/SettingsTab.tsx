import {
  DownloadIcon,
  FolderCogIcon,
  LucideBug,
  Monitor,
  ShieldAlert,
} from 'lucide-react';
import { useCallback } from 'react';
import { Combobox } from '../../../../components/Combobox';
import { Panel } from '../../../../components/Panel';
import { Toggle } from '../../../../components/Toggle';
import { saveInStorage } from '../../../../lib/storage';
import { LogLevel, Settings } from '../../../../lib/types';
import { FilenameTemplateMovie } from './FilenameTemplateBuilder';
import { SettingItem, SettingsSection } from './SettingsComponets';

type SettingsTabProps = {
  settings: Settings;
};

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

export function SettingsTab({ settings }: SettingsTabProps) {
  const updateSetting = useCallback(function <T>(key: string, type?: 'number') {
    return (value: T) => {
      const newValue = {
        ...settings,
        [key]: type === 'number' ? Number(value) : value,
      };
      saveInStorage('settings', newValue);
    };
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
            title='Приоритет загрузки'
            description='Что стоит загружать первым: видео или субтитры'
            value={settings.fileTypePriority}
            setValue={updateSetting('fileTypePriority')}
            options={[
              { value: 'video', label: 'Видео' },
              { value: 'subtitle', label: 'Субтитры' },
            ]}
            width={125}
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
            width={125}
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
            title='Если не удалось загрузить субтитры'
            description='Что делать если произошёл сбой при загрузки субтитров во время загрузки серии'
            value={settings.actionOnLoadSubtitleError}
            setValue={updateSetting('actionOnLoadSubtitleError')}
            options={[
              { value: 'skip', label: 'Пропустить эти субтитры' },
              { value: 'stop', label: 'Остановить загрузку сериала' },
            ]}
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

          {/*TODO: Доделать*/}
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
            <>
              <SettingsItemSelect
                title='Уровень отладки'
                description='Уровень логирования расширения'
                value={String(settings.debugLevel)}
                setValue={updateSetting('debugLevel')}
                options={Object.keys(LogLevel)
                  .filter((k) => isNaN(Number(k)))
                  .map((level, i) => ({ value: String(i), label: level }))}
                width={125}
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
                width={125}
              />
            </>
          )}

          <SettingsItemToggle
            title='Отслеживать события на именование файла onDeterminingFilename(НЕ актуально для Firefox)'
            description='Не изменяйте если у вас всё работает хорошо! Может помочь если есть другое расширение которое так же отслеживает события на именование фалов из-за чего возникает конфликт и файлы при загрузке имеют некорректные названия.'
            value={settings.trackEventsOnDeterminingFilename}
            setValue={updateSetting('trackEventsOnDeterminingFilename')}
          />
        </SettingsSection>
      </div>
    </Panel>
  );
}
