import { useCallback, useEffect } from 'react';
import {
  format,
  mapSelectionToTemplate,
  MARKUP,
  Placeholder,
  REGEXP_PLACEHOLDER_TEMPLATE,
} from '../../screens/Settings/SettingsTab/FilenameTemplateInput';

export function useInputCopyAndPasteHandlers(
  inputRef: React.RefObject<HTMLTextAreaElement | null>,
  rawUserTemplate: string,
  setRawUserTemplate: React.Dispatch<React.SetStateAction<string>>,
  placeholders: Placeholder[],
) {
  const getSelectionData = useCallback(() => {
    const relativeSelection = {
      start: inputRef.current!.selectionStart,
      end: inputRef.current!.selectionEnd,
    };
    const realSelection = mapSelectionToTemplate(
      rawUserTemplate,
      relativeSelection.start,
      relativeSelection.end,
    );
    return { realSelection, relativeSelection };
  }, [rawUserTemplate]);

  const getStringToCopy = useCallback(
    (selectionStart: number, selectionEnd: number) => {
      const targetString = rawUserTemplate.slice(selectionStart, selectionEnd);
      return targetString.replaceAll(
        new RegExp(REGEXP_PLACEHOLDER_TEMPLATE, 'g'),
        '$3',
      );
    },
    [rawUserTemplate],
  );

  const preventDefaultAndStop = useCallback((event: ClipboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleCopy = useCallback(
    (event: ClipboardEvent) => {
      const { realSelection } = getSelectionData();
      const stringToCopy = getStringToCopy(
        realSelection.start,
        realSelection.end,
      );

      event.clipboardData?.setData('text/plain', stringToCopy);
      preventDefaultAndStop(event);
    },
    [getSelectionData, getStringToCopy, preventDefaultAndStop],
  );

  const handleCut = useCallback(
    (event: ClipboardEvent) => {
      const { realSelection, relativeSelection } = getSelectionData();
      const stringToCopy = getStringToCopy(
        realSelection.start,
        realSelection.end,
      );

      event.clipboardData?.setData('text/plain', stringToCopy);

      setRawUserTemplate(
        rawUserTemplate.slice(0, realSelection.start) +
          rawUserTemplate.slice(realSelection.end),
      );
      preventDefaultAndStop(event);

      setTimeout(() => {
        const newCursorPos = relativeSelection.start;
        inputRef.current!.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current!.focus();
      }, 0);
    },
    [rawUserTemplate, getSelectionData, getStringToCopy, preventDefaultAndStop],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const { realSelection, relativeSelection } = getSelectionData();

      let pastedText = event.clipboardData?.getData('text/plain');
      if (!pastedText) return;
      for (const placeholder of placeholders) {
        pastedText = pastedText.replaceAll(
          placeholder.id,
          format(MARKUP, placeholder),
        );
      }

      setRawUserTemplate(
        rawUserTemplate.slice(0, realSelection.start) +
          pastedText +
          rawUserTemplate.slice(realSelection.end),
      );
      preventDefaultAndStop(event);

      setTimeout(() => {
        const pastedString = pastedText.replaceAll(
          new RegExp(REGEXP_PLACEHOLDER_TEMPLATE, 'g'),
          '$2',
        );
        const newCursorPos = relativeSelection.start + pastedString.length;
        inputRef.current!.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current!.focus();
      }, 0);
    },
    [
      rawUserTemplate,
      setRawUserTemplate,
      placeholders,
      getSelectionData,
      preventDefaultAndStop,
    ],
  );

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.addEventListener('copy', handleCopy);
    input.addEventListener('cut', handleCut);
    input.addEventListener('paste', handlePaste);

    return () => {
      input.removeEventListener('copy', handleCopy);
      input.removeEventListener('cut', handleCut);
      input.removeEventListener('paste', handlePaste);
    };
  }, [handleCopy, handleCut, handlePaste]);
}
