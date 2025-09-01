import { Bell, Database, Download, Monitor, Shield, User } from 'lucide-react';
import React, { memo, useState } from 'react';
import { Panel } from '../../../components/Panel';
import { cn } from '../../../lib/utils';

const Toggle = memo(function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type='button'
      className={cn(
        'focus:ring-link-color relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-offset-2 focus:outline-none',
        checked ? 'bg-link-color' : 'bg-settings-border-secondary',
        disabled && 'cursor-not-allowed opacity-50',
      )}
      role='switch'
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
});

const Select = memo(function Select({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'border-settings-border-secondary bg-settings-background-primary text-settings-text-secondary focus:border-link-color focus:ring-link-color block w-full rounded-md border px-3 py-2 shadow-sm focus:ring-1 focus:outline-none sm:text-sm',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

const Input = memo(function Input({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  min,
  max,
}: {
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      className={cn(
        'border-settings-border-secondary bg-settings-background-primary text-settings-text-secondary placeholder-settings-text-tertiary focus:border-link-color focus:ring-link-color block w-full rounded-md border px-3 py-2 shadow-sm focus:ring-1 focus:outline-none sm:text-sm',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    />
  );
});

const SettingItem = memo(function SettingItem({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between py-3', className)}>
      <div className='flex-1 pr-4'>
        <h4 className='text-settings-text-secondary text-base font-medium'>
          {title}
        </h4>
        {description && (
          <p className='text-settings-text-tertiary mt-1 text-sm'>
            {description}
          </p>
        )}
      </div>
      <div className='flex-shrink-0'>{children}</div>
    </div>
  );
});

function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}) {
  return (
    <div className='mb-8 last:mb-0'>
      <div className='mb-4 flex items-center'>
        {Icon && <Icon className='text-settings-text-tertiary mr-2 h-5 w-5' />}
        <h3 className='text-settings-text-primary text-lg font-semibold'>
          {title}
        </h3>
      </div>
      <div className='divide-settings-border-secondary space-y-0 divide-y'>
        {children}
      </div>
    </div>
  );
}

export function SettingsTab() {
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
            title='Темная тема'
            description='Использовать темное оформление интерфейса'
          >
            <Toggle checked={darkMode} onChange={setDarkMode} />
          </SettingItem>

          <SettingItem
            title='Язык интерфейса'
            description='Выберите предпочитаемый язык'
          >
            <div className='w-32'>
              <Select
                value={language}
                onChange={setLanguage}
                options={languageOptions}
              />
            </div>
          </SettingItem>

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
