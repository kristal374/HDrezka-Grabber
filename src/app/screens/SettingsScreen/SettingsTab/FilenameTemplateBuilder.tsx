import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mention,
  MentionsInput,
  OnChangeHandlerFunc,
  SuggestionFunc,
} from 'react-mentions';
import { SettingItemProps } from './SettingsTab';
import { useInputCopyAndPasteHandlers } from './hooks/useInputCopyAndPasteHandlers';
import { useInputDragHandlers } from './hooks/useInputDragHandlers';
import { useUndoRedoHandlers } from './hooks/useUndoRedoHandlers';

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
  // Когда первый элемент является плейсхолдером, то в начало массива будет добавлена пустая строка
  // А поскольку условие "v && i % 4 < 2" берёт по два элемента и пропускает пустые строки,
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

export function FilenameTemplateBuilder({
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
    setValue(newUserTemplate);
  }, [rawUserTemplate]);

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
        // TODO: Добавить уведомление о запрещённом символе
      }
      if (cleanedNewValue !== rawUserTemplate) {
        setRawUserTemplate(cleanedNewValue);
      }
    },
    [rawUserTemplate],
  );

  const customSuggestionsContainer = useCallback(
    (children: React.ReactNode) => (
      <div style={{ border: '1px solid #ccc', borderRadius: '4px' }}>
        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>{children}</div>
      </div>
    ),
    [],
  );

  const renderPlaceholderSuggestion = useCallback<SuggestionFunc>(
    (suggestion, _search, _highlightedDisplay, index, _focused) => {
      if (!placeholders[index]) return suggestion.display;
      return (
        <span className='flex w-full items-center justify-between gap-2 px-2 py-1 text-left text-xs'>
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
    <div>
      <MentionsInput
        inputRef={inputRef}
        value={rawUserTemplate}
        onChange={handleChange}
        // customSuggestionsContainer={customSuggestionsContainer}
        className='settings-background-primary text-settings-text-primary text-sm font-normal'
        // classNames={{
        //   'mentions__control': 'font-mono min-h-[63px] ',
        //   'mentions__highlighter': 'p-[9px] border border-transparent',
        //   'mentions__input': 'p-[9px] border border-silver outline-none',
        //   'mentions__suggestions': 'bg-settings-background-primary border border-black/15 text-sm',
        //   'mentions__suggestions__list': 'bg-settings-background-primary border border-black/15 text-sm',
        //   'mentions__suggestions__item': 'px-4 py-2 border-b border-black/15',
        //   'mentions__suggestions__item--focused': 'bg-link-color',
        // }}
        style={{
          '&multiLine': {
            control: {
              fontFamily: 'monospace',
              minHeight: 63,
            },
            highlighter: {
              padding: 9,
              border: '1px solid transparent',
            },
            input: {
              padding: 9,
              border: '1px solid silver',
            },
          },
          suggestions: {
            list: {
              backgroundColor: 'var(--settings-background-primary)',
              border: '1px solid rgba(0,0,0,0.15)',
              fontSize: 14,
            },
            item: {
              padding: '5px 15px',
              borderBottom: '1px solid rgba(0,0,0,0.15)',
              '&focused': {
                backgroundColor: 'var(--link-color)',
              },
            },
          },
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
    </div>
  );
}
