import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FilenameTemplateInput, Placeholder } from './FilenameTemplateInput';
import { PreviewItem, SettingItemProps } from './SettingsTab';

type FilenameTemplateProps = SettingItemProps<string[]> & {
  placeholders: Placeholder[];
  readyTemplates: string[][];
  previews: PreviewItem[];
};

export function FilenameTemplateMovie({
  value,
  setValue,
  placeholders,
  readyTemplates,
  previews,
}: FilenameTemplateProps) {
  const [showAllPreviews, setShowAllPreviews] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = (_event: MouseEvent) => {
      setShowDropdown(false);
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDropdown]);

  const displayedPreviews = useMemo(
    () => (showAllPreviews ? previews : previews.slice(0, 1)),
    [showAllPreviews, previews],
  );

  const handleTemplateSelect = (template: string[]) => {
    setValue(template);
    setShowDropdown(false);
  };

  const toggleDropdown = () => {
    setShowDropdown((prev) => !prev);
  };

  const togglePreviewsVisibility = () => {
    setShowAllPreviews((prev) => !prev);
  };

  return (
    <>
      <div className='relative'>
        <FilenameTemplateInput
          value={value}
          setValue={setValue}
          className='border-settings-border-primary rounded-xl border'
          placeholders={placeholders}
        />

        <button
          onClick={toggleDropdown}
          className='hover:bg-settings-border-primary focus:bg-settings-border-primary absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 transition-colors focus:outline-none'
          type='button'
          title='Выбрать шаблон'
          aria-label='Выбрать шаблон'
          aria-expanded={showDropdown}
          aria-haspopup='listbox'
        >
          <ChevronDown
            className={`text-settings-text-secondary h-4 w-4 transition-transform duration-200 ${
              showDropdown ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showDropdown && (
          <div className='border-settings-border-tertiary bg-settings-background-primary absolute z-10 mt-1 w-full rounded-lg border shadow-lg'>
            <ul
              className='max-h-48 overflow-y-auto text-sm'
              role='listbox'
              aria-label='Список готовых шаблонов'
            >
              {readyTemplates.map((template, index) => (
                <li key={index} role='option'>
                  <button
                    onClick={() => handleTemplateSelect(template)}
                    className='hover:bg-link-color focus:bg-link-color text-settings-text-primary w-full px-3 py-2 text-left transition-colors focus:outline-none'
                    type='button'
                    tabIndex={-1}
                  >
                    {Array.isArray(template) ? template.join('') : template}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className='text-settings-text-tertiary mt-2 text-xs'>
        Введите % чтобы добавить переменную
      </p>

      <div className='mt-5'>
        <div className='mb-2 flex items-center justify-between'>
          <h3 className='text-settings-text-primary text-sm font-medium'>
            Предпросмотр результата:
          </h3>
          {previews.length > 1 && (
            <button
              className='text-settings-text-tertiary hover:text-settings-text-secondary text-xs transition-colors hover:underline focus:underline focus:outline-none'
              onClick={togglePreviewsVisibility}
              type='button'
              aria-label={
                showAllPreviews
                  ? 'Скрыть дополнительные превью'
                  : 'Показать все превью'
              }
            >
              {showAllPreviews ? 'Скрыть' : 'Показать все'}
            </button>
          )}
        </div>

        <div className='space-y-2'>
          {displayedPreviews.map((preview, index) => (
            <div
              key={index}
              className='bg-settings-background-secondary border-settings-border-primary rounded-lg border p-3 transition-colors'
            >
              <div className='text-settings-text-tertiary mb-2 text-xs font-medium'>
                {preview.label}
              </div>
              <div className='text-settings-text-primary font-mono text-sm break-all'>
                {preview.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
