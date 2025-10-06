import {
  format,
  mapSelectionToTemplate,
  MARKUP,
  Placeholder,
  REGEXP_PLACEHOLDER_TEMPLATE,
} from '@/app/screens/Settings/SettingsTab/FilenameTemplateInput';
import { useCallback, useEffect, useRef } from 'react';

export function useInputDragHandlers(
  inputRef: React.RefObject<HTMLTextAreaElement | null>,
  rawUserTemplate: string,
  setRawUserTemplate: React.Dispatch<React.SetStateAction<string>>,
  placeholders: Placeholder[],
) {
  const dragDataRef = useRef<{
    content: string;
    startPos: number;
    endPos: number;
  } | null>(null);

  const handleDragStart = useCallback(
    (e: DragEvent) => {
      const { selectionStart, selectionEnd } = inputRef.current!;
      const realSelection = mapSelectionToTemplate(
        rawUserTemplate,
        selectionStart,
        selectionEnd,
      );
      const targetString = rawUserTemplate.slice(
        realSelection.start,
        realSelection.end,
      );
      const stringToCopy = targetString.replaceAll(
        new RegExp(REGEXP_PLACEHOLDER_TEMPLATE, 'g'),
        '$3',
      );

      dragDataRef.current = {
        content: stringToCopy,
        startPos: realSelection.start,
        endPos: realSelection.end,
      };

      e.dataTransfer?.setData('text/plain', stringToCopy);
      e.dataTransfer!.effectAllowed = 'move';
    },
    [rawUserTemplate],
  );

  const handleDragEnd = useCallback((_e: DragEvent) => {
    dragDataRef.current = null;
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    if (dragDataRef.current) {
      e.dataTransfer!.dropEffect = 'move';
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();

      if (!dragDataRef.current) return;

      // Немного коряво работает на Firefox, стоит как-то дополнительно обрабатывать ось "у"
      const dropPosition = document.caretPositionFromPoint(
        e.clientX,
        e.clientY,
      );
      if (dropPosition !== null) {
        const newDropPosition = mapSelectionToTemplate(
          rawUserTemplate,
          dropPosition.offset,
          dropPosition.offset,
        );

        const minPos = {
          start: Math.min(dragDataRef.current.startPos, newDropPosition.start),
          end: Math.min(dragDataRef.current.endPos, newDropPosition.end),
        };
        const maxPos = {
          start: Math.max(dragDataRef.current.startPos, newDropPosition.start),
          end: Math.max(dragDataRef.current.endPos, newDropPosition.end),
        };

        let dropContent = dragDataRef.current.content;
        if (!dropContent) return;
        for (const placeholder of placeholders) {
          dropContent = dropContent.replaceAll(
            placeholder.id,
            format(MARKUP, placeholder),
          );
        }
        setRawUserTemplate(
          rawUserTemplate.slice(0, minPos.start) +
            (minPos.start === newDropPosition.start ? dropContent : '') +
            rawUserTemplate.slice(minPos.end, maxPos.start) +
            (maxPos.start === newDropPosition.start ? dropContent : '') +
            rawUserTemplate.slice(maxPos.end),
        );

        setTimeout(() => {
          const dropString = dropContent.replaceAll(
            new RegExp(REGEXP_PLACEHOLDER_TEMPLATE, 'g'),
            '$2',
          );
          const newCursorPos = dropPosition.offset + dropString.length;
          inputRef.current!.setSelectionRange(newCursorPos, newCursorPos);
          inputRef.current!.focus();
        }, 0);
      }

      dragDataRef.current = null;
    },
    [rawUserTemplate, setRawUserTemplate, placeholders],
  );

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.addEventListener('dragstart', handleDragStart);
    input.addEventListener('dragend', handleDragEnd);
    input.addEventListener('dragover', handleDragOver);
    input.addEventListener('drop', handleDrop);

    return () => {
      input.removeEventListener('dragstart', handleDragStart);
      input.removeEventListener('dragend', handleDragEnd);
      input.removeEventListener('dragover', handleDragOver);
      input.removeEventListener('drop', handleDrop);
    };
  }, [rawUserTemplate]);
}
