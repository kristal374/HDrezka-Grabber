import { Button } from '@/components/ui/Button';
import {
  cleanTitle,
  makePathAndFilename,
  Replacements,
} from '@/lib/filename-maker';
import { cn } from '@/lib/utils';
import equal from 'fast-deep-equal/es6';
import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FilenameTemplateInput, Placeholder } from './FilenameTemplateInput';
import { SettingItemProps } from './SettingsTab';

export type PreviewItem = {
  label: string;
  value: Replacements;
};

type FilenameTemplateProps = SettingItemProps<string[]> & {
  fieldId: string;
  title: string;
  placeholders: Placeholder[];
  readyTemplates: string[][];
  previews: PreviewItem[];
};

export function FilenameTemplateComponent({
  fieldId,
  value,
  setValue,
  title,
  placeholders,
  readyTemplates,
  previews,
}: FilenameTemplateProps) {
  return (
    <div className='flex flex-col'>
      <hr className='border-settings-border-primary mb-5 border-t' />
      <h2 className='text-settings-text-primary mb-3 text-lg font-medium'>
        {title}
      </h2>

      <div className='relative'>
        <FilenameTemplateInput
          fieldId={fieldId}
          value={value}
          setValue={setValue}
          placeholders={placeholders}
        />
        <DropDownMenu
          value={value}
          setValue={setValue}
          placeholders={placeholders}
          readyTemplates={readyTemplates}
        />
      </div>
      <PreviewItems previews={previews} />
    </div>
  );
}

type DropDownMenuProps = {
  value: string[];
  setValue: (value: string[]) => void;
  placeholders: Placeholder[];
  readyTemplates: string[][];
};

function templateToPreview(
  template: string[],
  placeholders: Placeholder[],
): string {
  const replacements: Record<string, string> = Object.fromEntries(
    placeholders.map((item) => [item.id, item.display]),
  );

  return template
    .map((item) =>
      item.startsWith('%') && item.endsWith('%')
        ? (replacements[item] ?? item ?? '')
        : (item ?? ''),
    )
    .join('');
}

function DropDownMenu({
  value,
  setValue,
  placeholders,
  readyTemplates,
}: DropDownMenuProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropDownRef = useRef<HTMLDivElement | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleTemplateSelect = useCallback(
    (template: string[]) => {
      setValue(template);
      setShowDropdown(false);
    },
    [setValue, setShowDropdown],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (event.target === buttonRef.current) return;
      if (dropDownRef.current?.contains(event.target as Node)) return;
      setShowDropdown(false);
    };

    if (!showDropdown) return;

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <>
      <Button
        ref={buttonRef}
        variant='ghost'
        size='square'
        className='absolute top-1/2 right-2 -translate-y-1/2'
        onClick={() => setShowDropdown((prev) => !prev)}
        title='Выбрать шаблон'
        aria-expanded={showDropdown}
        aria-haspopup='listbox'
      >
        <ChevronDown
          className={cn(
            'text-settings-text-secondary pointer-events-none size-4 transition-transform duration-200',
            showDropdown && 'rotate-180',
          )}
        />
      </Button>

      {showDropdown && (
        <div
          ref={dropDownRef}
          className='border-settings-border-tertiary bg-settings-background-primary absolute z-10 mt-1 w-full rounded-lg border shadow-lg'
        >
          <ul
            className='max-h-48 overflow-y-auto text-sm'
            role='listbox'
            aria-label='Список готовых шаблонов'
          >
            {readyTemplates
              .filter(
                (template) => template.length > 0 && !equal(template, value),
              )
              .map((template, index) => (
                <li key={index} role='option'>
                  <button
                    onClick={() => handleTemplateSelect(template)}
                    className='hover:bg-link-color focus:bg-link-color text-settings-text-primary bg-input w-full px-3 py-2 text-left transition-colors focus:outline-none'
                    type='button'
                  >
                    {templateToPreview(template, placeholders)}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </>
  );
}

type PreviewItemProps = {
  previews: PreviewItem[];
};

function PreviewItems({ previews }: PreviewItemProps) {
  const [showAllPreviews, setShowAllPreviews] = useState(false);

  const displayedPreviews = useMemo(
    () => (showAllPreviews ? previews : previews.slice(0, 1)),
    [showAllPreviews, previews],
  );

  return (
    <>
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
              onClick={() => setShowAllPreviews((prev) => !prev)}
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

        <div className='flex flex-col gap-3'>
          {displayedPreviews.map((preview, index) => {
            preview.value['%title%'] = cleanTitle(preview.value['%title%']);
            preview.value['%orig_title%'] =
              cleanTitle(preview.value['%orig_title%']) ??
              cleanTitle(preview.value['%title%']);

            // Имитация получения времени из вне
            const timestamp = new Date().getTime();
            preview.value['%data%'] = new Date(timestamp)
              .toLocaleString()
              .split(', ')[0];
            preview.value['%time%'] = new Date(timestamp)
              .toLocaleString()
              .split(', ')[1]
              .replaceAll(':', '-');

            return (
              <div
                key={index}
                className='bg-settings-background-secondary border-settings-border-primary rounded-lg border p-3 transition-colors'
              >
                <div className='text-settings-text-tertiary mb-2 text-xs font-medium'>
                  {preview.label}
                </div>
                <div className='text-settings-text-primary font-mono text-sm break-all'>
                  {makePathAndFilename(preview.value, 'video')[1]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
