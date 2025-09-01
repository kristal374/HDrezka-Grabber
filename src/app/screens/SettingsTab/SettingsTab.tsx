import { Bell, Database, Download, Monitor, Shield, User } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Input } from '../../../components/Input';
import { Panel } from '../../../components/Panel';
import { Select } from '../../../components/Select';
import { Toggle } from '../../../components/Toggle';
import { SettingItem, SettingsSection } from './SettingsComponets';

type SettingItemProps<T> = {
  value: T;
  setValue: (value: T) => void;
};

function DarkMode({ value, setValue }: SettingItemProps<boolean>) {
  return (
    <SettingItem
      title='Темная тема'
      description='Использовать темное оформление интерфейса'
    >
      <Toggle checked={value} onChange={setValue} />
    </SettingItem>
  );
}

function EnableLogger({ value, setValue }: SettingItemProps<boolean>) {
  return (
    <SettingItem
      title='Включить логирование'
      description='Включить логирование в консоль'
    >
      <Toggle checked={value} onChange={setValue} />
    </SettingItem>
  );
}

function FilenameTemplate({ value, setValue }: SettingItemProps<string>) {
  return (
    <SettingItem
      title='Шаблон имени файла'
      description='Шаблон имени файла при сохранении файла'
      className='flex-col items-start'
    >
      <div className='flex gap-3'>
        <div className='flex flex-col gap-3'>
          <Input value={value} onChange={setValue} placeholder='Имя файла' />
          <p>Preview: {value.replace('{title}', 'Тестовый фильм')}</p>
        </div>
        <p>
          Шаблон может содержать следующие переменные:
          <br />
          <code>{'{title}'}</code> - название фильма или сериала
          <br />
          <code>{'{year}'}</code> - год выпуска
          <br />
          <code>{'{season}'}</code> - название сезона
          <br />
          <code>{'{episode}'}</code> - номер серии
        </p>
      </div>
    </SettingItem>
  );
}

export function SettingsTab() {
  const [settings, setSettings] = useState({
    darkMode: true,
    enableLogger: false,
    filenameTemplate: '{title}',
  });
  console.log(settings);
  const updateSetting = useCallback(function <T>(key: string) {
    return (value: T) => setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);
  return (
    <Panel>
      <div className='flex flex-col gap-8'>
        <SettingsSection title='Настройки интерфейса' icon={Monitor}>
          <DarkMode
            value={settings.darkMode}
            setValue={updateSetting('darkMode')}
          />
          <EnableLogger
            value={settings.enableLogger}
            setValue={updateSetting('enableLogger')}
          />
          {settings.enableLogger && (
            <>
              <FilenameTemplate
                value={settings.filenameTemplate}
                setValue={updateSetting('filenameTemplate')}
              />
            </>
          )}
        </SettingsSection>
      </div>
    </Panel>
  );
}

export function SettingsTab2() {
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('ru');
  const [fontSize, setFontSize] = useState('medium');
  const [animations, setAnimations] = useState(true);

  const [autoSave, setAutoSave] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [dataRetention, setDataRetention] = useState('30');
  const [compression, setCompression] = useState(true);

  const [maxFileSize, setMaxFileSize] = useState('10');
  const [allowedTypes, setAllowedTypes] = useState('all');
  const [parallelUploads, setParallelUploads] = useState('3');
  const [autoUpload, setAutoUpload] = useState(false);

  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [ipRestriction, setIpRestriction] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const [username, setUsername] = useState('user@example.com');
  const [displayName, setDisplayName] = useState('Пользователь');

  const languageOptions = [
    { value: 'ru', label: 'Русский' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Українська' },
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Маленький' },
    { value: 'medium', label: 'Средний' },
    { value: 'large', label: 'Большой' },
  ];

  const backupOptions = [
    { value: 'hourly', label: 'Каждый час' },
    { value: 'daily', label: 'Ежедневно' },
    { value: 'weekly', label: 'Еженедельно' },
  ];

  const fileTypeOptions = [
    { value: 'all', label: 'Все типы' },
    { value: 'images', label: 'Только изображения' },
    { value: 'documents', label: 'Только документы' },
  ];

  const timeoutOptions = [
    { value: '15', label: '15 минут' },
    { value: '30', label: '30 минут' },
    { value: '60', label: '1 час' },
    { value: '120', label: '2 часа' },
  ];

  return (
    <Panel>
      <div className='space-y-8'>
        <SettingsSection title='Настройки интерфейса' icon={Monitor}>
          <SettingItem
            title='Размер шрифта'
            description='Настройка размера текста в интерфейсе'
          >
            <div className='w-32'>
              <Select
                value={fontSize}
                onChange={setFontSize}
                options={fontSizeOptions}
              />
            </div>
          </SettingItem>

          <SettingItem
            title='Анимации'
            description='Включить плавные переходы и анимации'
          >
            <Toggle checked={animations} onChange={setAnimations} />
          </SettingItem>
        </SettingsSection>

        <SettingsSection title='Работа с данными' icon={Database}>
          <SettingItem
            title='Автосохранение'
            description='Автоматически сохранять изменения'
          >
            <Toggle checked={autoSave} onChange={setAutoSave} />
          </SettingItem>

          <SettingItem
            title='Частота резервного копирования'
            description='Как часто создавать резервные копии'
          >
            <div className='w-40'>
              <Select
                value={backupFrequency}
                onChange={setBackupFrequency}
                options={backupOptions}
              />
            </div>
          </SettingItem>

          <SettingItem
            title='Хранение данных (дней)'
            description='Сколько дней хранить данные перед архивированием'
          >
            <div className='w-24'>
              <Input
                type='number'
                value={dataRetention}
                onChange={setDataRetention}
                placeholder='30'
              />
            </div>
          </SettingItem>

          <SettingItem
            title='Сжатие данных'
            description='Сжимать данные для экономии места'
          >
            <Toggle checked={compression} onChange={setCompression} />
          </SettingItem>
        </SettingsSection>

        <SettingsSection title='Настройки загрузчика' icon={Download}>
          <SettingItem
            title='Максимальный размер файла (МБ)'
            description='Максимальный размер загружаемого файла'
          >
            <div className='w-24'>
              <Input
                type='number'
                value={maxFileSize}
                onChange={setMaxFileSize}
                placeholder='10'
              />
            </div>
          </SettingItem>

          <SettingItem
            title='Разрешенные типы файлов'
            description='Какие типы файлов можно загружать'
          >
            <div className='w-40'>
              <Select
                value={allowedTypes}
                onChange={setAllowedTypes}
                options={fileTypeOptions}
              />
            </div>
          </SettingItem>

          <SettingItem
            title='Параллельные загрузки'
            description='Количество одновременных загрузок'
          >
            <div className='w-24'>
              <Input
                type='number'
                value={parallelUploads}
                onChange={setParallelUploads}
                placeholder='3'
                min='1'
                max='10'
              />
            </div>
          </SettingItem>

          <SettingItem
            title='Автоматическая загрузка'
            description='Начинать загрузку сразу после выбора файла'
          >
            <Toggle checked={autoUpload} onChange={setAutoUpload} />
          </SettingItem>
        </SettingsSection>

        <SettingsSection title='Безопасность' icon={Shield}>
          <SettingItem
            title='Двухфакторная аутентификация'
            description='Дополнительный уровень защиты аккаунта'
          >
            <Toggle checked={twoFactor} onChange={setTwoFactor} />
          </SettingItem>

          <SettingItem
            title='Таймаут сессии (минут)'
            description='Автоматический выход при неактивности'
          >
            <div className='w-32'>
              <Select
                value={sessionTimeout}
                onChange={setSessionTimeout}
                options={timeoutOptions}
              />
            </div>
          </SettingItem>

          <SettingItem
            title='Ограничение по IP'
            description='Разрешить доступ только с определенных IP'
          >
            <Toggle checked={ipRestriction} onChange={setIpRestriction} />
          </SettingItem>
        </SettingsSection>

        <SettingsSection title='Уведомления' icon={Bell}>
          <SettingItem
            title='Email уведомления'
            description='Получать уведомления на электронную почту'
          >
            <Toggle
              checked={emailNotifications}
              onChange={setEmailNotifications}
            />
          </SettingItem>

          <SettingItem
            title='Push-уведомления'
            description='Показывать уведомления в браузере'
          >
            <Toggle
              checked={pushNotifications}
              onChange={setPushNotifications}
            />
          </SettingItem>

          <SettingItem
            title='Звуковые уведомления'
            description='Воспроизводить звук при получении уведомлений'
          >
            <Toggle checked={soundEnabled} onChange={setSoundEnabled} />
          </SettingItem>
        </SettingsSection>

        <SettingsSection title='Профиль пользователя' icon={User}>
          <SettingItem
            title='Имя пользователя'
            description='Ваш логин в системе'
          >
            <div className='w-48'>
              <Input
                type='email'
                value={username}
                onChange={setUsername}
                placeholder='user@example.com'
              />
            </div>
          </SettingItem>

          <SettingItem
            title='Отображаемое имя'
            description='Имя, которое видят другие пользователи'
          >
            <div className='w-48'>
              <Input
                value={displayName}
                onChange={setDisplayName}
                placeholder='Ваше имя'
              />
            </div>
          </SettingItem>
        </SettingsSection>
      </div>
    </Panel>
  );
}
