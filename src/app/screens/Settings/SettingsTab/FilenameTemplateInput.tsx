import { useInputCopyAndPasteHandlers } from '@/app/hooks/settings/useInputCopyAndPasteHandlers';
import { useInputDragHandlers } from '@/app/hooks/settings/useInputDragHandlers';
import { useUndoRedoHandlers } from '@/app/hooks/settings/useUndoRedoHandlers';
import { cn } from '@/lib/utils';
import equal from 'fast-deep-equal/es6';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mention,
  MentionsInput,
  OnChangeHandlerFunc,
  SuggestionFunc,
} from 'react-mentions';
import { toast } from 'sonner';
import { SettingItemProps } from './SettingsTab';

export const MARKUP = '\\[__display__\\](__id__)';
export const REGEXP_PLACEHOLDER_TEMPLATE = /(\\\[([A-я\s]+)\\]\((%[a-z_]+%)\))/;

export const INVALID_CHARACTERS = /[\n\\\/:*?"<>|]/g;

export type Placeholder = {
  id: string;
  display: string;
};

type FilenameTemplateBuilderProps = SettingItemProps<string[]> & {
  placeholders: Placeholder[];
};

export const format = (str: string, args: Record<string, string>): string => {
  return str.replace(
    /__\w+__/g,
    (match) => args[match.slice(2, match.length - 2)] ?? match,
  );
};

const isPlaceholder = (str: string, placeholders: Placeholder[]): boolean =>
  placeholders.some((placeholder) => placeholder.id === str);

const findTargetPlaceholder = (
  str: string,
  placeholders: Placeholder[],
): Placeholder | undefined =>
  placeholders.find((placeholder) => placeholder.id === str);

const placeholderIdToValue = (
  item: string,
  placeholders: Placeholder[],
): string => {
  return isPlaceholder(item, placeholders)
    ? format(MARKUP, findTargetPlaceholder(item, placeholders)!)
    : item;
};

const splitStringAlongPlaceholderBorder = (str: string): string[] => {
  // Условие "v && i % 4 < 2" пропускает лишние группы после разбивки регулярным выражением.
  // Когда первый элемент является плейсхолдером, то в начало массива будет добавлена пустая строка,
  // а поскольку условие "v && i % 4 < 2" берёт по два элемента и пропускает пустые строки,
  // будет взят только плейсхолдер, при этом следующие две группы будут пропущены.
  // Если первым элементом будет текст, то за ним гарантированно следует плейсхолдер.
  // Поскольку пустой строки в начале массива не будет, то фильтр возьмёт первые два элемента.
  // Следовательно, это будет текст и плейсхолдер, следующие группы до текста вновь будут пропущены.
  return str
    .split(REGEXP_PLACEHOLDER_TEMPLATE)
    .filter((v, i) => v && i % 4 < 2);
};

export const mapSelectionToTemplate = (
  templateString: string,
  selectionStart: number,
  selectionEnd: number,
): { start: number; end: number } => {
  const prepareStrings = splitStringAlongPlaceholderBorder(templateString);
  const realIndexes = { start: -1, end: -1 };

  let fictiveLineIndex = 0;
  let realLineIndex = 0;
  prepareStrings.forEach((item) => {
    const match = item.match(REGEXP_PLACEHOLDER_TEMPLATE);
    fictiveLineIndex += match ? match[2].length : item.length;
    realLineIndex += item.length;

    if (realIndexes.start === -1 && fictiveLineIndex >= selectionStart) {
      realIndexes.start = !match
        ? realLineIndex - (fictiveLineIndex - selectionStart)
        : match && fictiveLineIndex !== selectionStart
          ? realLineIndex - match[1].length
          : realLineIndex;
    }
    if (realIndexes.end === -1 && fictiveLineIndex >= selectionEnd) {
      realIndexes.end = !match
        ? realLineIndex - (fictiveLineIndex - selectionEnd)
        : realLineIndex;
    }
  });

  return realIndexes;
};

export function FilenameTemplateInput({
  value,
  setValue,
  placeholders,
}: FilenameTemplateBuilderProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [rawUserTemplate, setRawUserTemplate] = useState(
    value.map((item) => placeholderIdToValue(item, placeholders)).join(''),
  );

  useInputDragHandlers(
    inputRef,
    rawUserTemplate,
    setRawUserTemplate,
    placeholders,
  );
  useInputCopyAndPasteHandlers(
    inputRef,
    rawUserTemplate,
    setRawUserTemplate,
    placeholders,
  );
  useUndoRedoHandlers(rawUserTemplate, setRawUserTemplate, inputRef);

  useEffect(() => {
    const newUserTemplate = splitStringAlongPlaceholderBorder(
      rawUserTemplate,
    ).map((item) =>
      REGEXP_PLACEHOLDER_TEMPLATE.test(item)
        ? item.match(REGEXP_PLACEHOLDER_TEMPLATE)![3]
        : item,
    );
    if (!equal(value, newUserTemplate)) {
      setValue(newUserTemplate);
    }
  }, [rawUserTemplate]);

  useEffect(() => {
    // Костыль, позволяющий обновить данные из вне
    const newValue = value
      .map((item) => placeholderIdToValue(item, placeholders))
      .join('');
    if (newValue !== rawUserTemplate) {
      setRawUserTemplate(newValue);
    }
  }, [value]);

  const handleChange: OnChangeHandlerFunc = useCallback(
    (event) => {
      const rawValue = event.target.value;
      const cleanedNewValue = splitStringAlongPlaceholderBorder(rawValue)
        .map((item) =>
          !REGEXP_PLACEHOLDER_TEMPLATE.test(item)
            ? item.replaceAll(INVALID_CHARACTERS, '')
            : item,
        )
        .join('');

      if (rawValue !== cleanedNewValue) {
        toast.error(
          'Имя файла не должно содержать переносов строк и следующих знаков: \\ / * ? : | < > "',
        );
      }
      if (cleanedNewValue !== rawUserTemplate) {
        setRawUserTemplate(cleanedNewValue);
      }
    },
    [rawUserTemplate],
  );

  const renderPlaceholderSuggestion = useCallback<SuggestionFunc>(
    (suggestion, _search, _highlightedDisplay, index, _focused) => {
      if (!placeholders[index]) return suggestion.display;
      return (
        <span className='flex w-full items-center justify-between gap-2 text-left text-xs'>
          {suggestion.display}
        </span>
      );
    },
    [placeholders],
  );

  const displayTransformHandler = useCallback(
    (_id: string, display: string) => display,
    [],
  );

  return (
    <MentionsInput
      id='editor-template'
      inputRef={inputRef}
      value={rawUserTemplate}
      onChange={handleChange}
      className='mentions'
      classNames={{
        mentions__control: 'font-mono',
        mentions__highlighter: 'py-2 pl-2 pr-10 !text-base',
        mentions__input: cn(
          'py-2 pl-2 pr-10 !text-base',
          'border-settings-border-primary rounded-lg border bg-settings-background-primary text-settings-text-primary font-normal',
          'ring-link-color ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        ),
        mentions__suggestions:
          '!bg-input text-foreground text-sm border-input-active rounded-md border shadow-md',
        mentions__suggestions__list: 'flex flex-col !p-1',
        mentions__suggestions__item:
          'flex grow cursor-default items-center rounded-sm px-2 py-1.5 text-sm select-none',
        'mentions__suggestions__item--focused': 'bg-link-color',
      }}
    >
      <Mention
        trigger={/(%(?!\s)([^%]*))$/}
        markup={MARKUP}
        data={placeholders}
        renderSuggestion={renderPlaceholderSuggestion}
        className='bg-settings-border-tertiary text-settings-text-primary rounded'
        displayTransform={displayTransformHandler}
      />
    </MentionsInput>
  );
}
