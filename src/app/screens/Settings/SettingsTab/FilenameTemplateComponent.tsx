import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import {
  Reveal,
  RevealContent,
  RevealTrigger,
} from '@/components/ui/RevealAnimation';
import {
  cleanTitle,
  makePathAndFilename,
  Replacements,
} from '@/lib/filename-maker';
import { cn } from '@/lib/utils';
import { useState } from 'react';
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
  const [localValue, setLocalValue] = useState(() => value);
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
          setValue={setValue}
          setLocalValue={setLocalValue}
          placeholders={placeholders}
          readyTemplates={readyTemplates}
        />
      </div>
      <p className='text-settings-text-tertiary mt-2 text-xs'>
        {browser.i18n.getMessage('settings_filenameHelpTemplate')}
      </p>
      <PreviewItems previews={previews} localValue={localValue} />
    </div>
  );
}

/**
 * Takes template array and returns array of strings with placeholders replaced by their display values
 * Needs to be `.join('')` to get plain string
 */
function templateToPreview(
  template: string[],
  placeholders: Placeholder[],
): string[] {
  const replacements: Record<string, string> = Object.fromEntries(
    placeholders.map((item) => [item.id, item.display]),
  );

  return template.map((item) =>
    item.startsWith('%') && item.endsWith('%')
      ? (replacements[item] ?? item ?? '')
      : (item ?? ''),
  );
}

type DropDownMenuProps = {
  setValue: (value: string[]) => void;
  setLocalValue: (value: string[]) => void;
  placeholders: Placeholder[];
  readyTemplates: string[][];
};

function DropDownMenu({
  setValue,
  setLocalValue,
  placeholders,
  readyTemplates,
}: DropDownMenuProps) {
  const handleTemplateSelect = (template: string[]) => {
    setValue(template);
    setLocalValue(template);
  };

  return (
    <>
      <Combobox
        width='1.75rem'
        containerClassName='absolute top-1/2 right-2 -translate-y-1/2 border-0 [&>svg]:!opacity-100'
        className='p-1'
        itemClassName='block !bg-transparent'
        showChevron={true}
        align='end'
        side='top'
        value={JSON.stringify(readyTemplates[0])}
        onValueChange={(value) => {
          handleTemplateSelect(JSON.parse(value));
        }}
        onValueHover={(value) => {
          setLocalValue(JSON.parse(value));
        }}
        title={browser.i18n.getMessage('settings_filenameSelectTemplate')}
        data={readyTemplates.map((template) => {
          const preview = templateToPreview(template, placeholders);
          return {
            value: JSON.stringify(template),
            label: preview.join(''),
            labelComponent: ({ isRenderingInPreview }) => {
              if (isRenderingInPreview) {
                return <span className='invisible'>|</span>;
              }
              return (
                <>
                  {template.map((part, i) => {
                    const isPlaceholder =
                      part.startsWith('%') && part.endsWith('%');
                    return (
                      <span
                        className={cn(
                          isPlaceholder &&
                            'bg-input-active [[data-selected]_&]:bg-input-active/50 rounded',
                        )}
                      >
                        {preview[i]}
                      </span>
                    );
                  })}
                </>
              );
            },
          };
        })}
      />
    </>
  );
}

type PreviewItemProps = {
  previews: PreviewItem[];
  localValue: string[];
};

function PreviewItems({ previews, localValue }: PreviewItemProps) {
  const [showAllPreviews, setShowAllPreviews] = useState(false);
  return (
    <Reveal className='mt-5'>
      <div className='mb-2 flex items-center justify-between'>
        <h3 className='text-settings-text-primary text-sm font-medium'>
          {browser.i18n.getMessage('settings_preview_text')}
        </h3>
        {previews.length > 1 && (
          <RevealTrigger>
            <Button
              variant='ghost'
              onClick={() => setShowAllPreviews((prev) => !prev)}
              title={
                showAllPreviews
                  ? browser.i18n.getMessage('settings_hidePreview_title')
                  : browser.i18n.getMessage('settings_showPreview_title')
              }
            >
              {showAllPreviews
                ? browser.i18n.getMessage('settings_hidePreview')
                : browser.i18n.getMessage('settings_showPreview')}
            </Button>
          </RevealTrigger>
        )}
      </div>

      <Preview preview={previews[0]} localValue={localValue} />

      {previews.length > 1 && (
        <RevealContent>
          <div className='mt-3 flex flex-col gap-3'>
            {previews.map((preview, i) => {
              if (i === 0) return null;
              return (
                <Preview key={i} preview={preview} localValue={localValue} />
              );
            })}
          </div>
        </RevealContent>
      )}
    </Reveal>
  );
}

type PreviewProps = {
  preview: PreviewItem;
  localValue: string[];
};

function Preview({ preview: previewProp, localValue }: PreviewProps) {
  const preview: PreviewItem = JSON.parse(JSON.stringify(previewProp));
  preview.value['%title%'] = cleanTitle(preview.value['%title%']);
  preview.value['%orig_title%'] =
    cleanTitle(preview.value['%orig_title%']) ??
    cleanTitle(preview.value['%title%']);

  preview.value['%episode_id%'] = preview.value['%episode_id%']?.padStart(
    2,
    '0',
  );
  preview.value['%season_id%'] = preview.value['%season_id%']?.padStart(2, '0');

  // Имитация получения времени из вне
  const timestamp = new Date().getTime();
  preview.value['%data%'] = new Date(timestamp).toLocaleString().split(', ')[0];
  preview.value['%time%'] = new Date(timestamp)
    .toLocaleString()
    .split(', ')[1]
    .replaceAll(':', '-');

  return (
    <div className='bg-settings-background-secondary border-settings-border-primary rounded-lg border p-3 transition-colors'>
      <div className='text-settings-text-tertiary mb-2 text-xs font-medium'>
        {preview.label}
      </div>
      <div className='text-settings-text-primary font-mono text-sm break-all'>
        {makePathAndFilename(preview.value, 'video', localValue)[1]}
      </div>
    </div>
  );
}
