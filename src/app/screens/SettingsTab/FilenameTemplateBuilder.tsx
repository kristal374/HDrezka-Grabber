import { XIcon } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cn } from '../../../lib/utils';

const TAGS = [
  { key: '#n#', desc: 'Номер файла' },
  { key: '#movie_id#', desc: 'ID фильма' },
  { key: '#title#', desc: 'Название' },
  { key: '#orig_title#', desc: 'Оригинальное название' },
  { key: '#translate#', desc: 'Озвучка' },
  { key: '#translate_id#', desc: 'ID озвучки' },
  { key: '#episode#', desc: 'Серия' },
  { key: '#episode_id#', desc: 'ID серии' },
  { key: '#season#', desc: 'Сезон' },
  { key: '#season_id#', desc: 'ID сезона' },
  { key: '#quality#', desc: 'Качество' },
  { key: '#subtitle_code#', desc: 'Код субтитров' },
  { key: '#subtitle_lang#', desc: 'Язык субтитров' },
  { key: '#data#', desc: 'Дата' },
  { key: '#time#', desc: 'Время' },
];

const GAP_CHAR = '\u200B'; // zero-width space to allow caret between chips

export type FilenameTemplateBuilderProps = {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
};

// Helpers to convert between DOM representation and template string
function serializeEditor(root: HTMLElement): string {
  const parts: string[] = [];
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || '')
        .replace(/\u00A0/g, ' ')
        .replace(new RegExp(GAP_CHAR, 'g'), '');
      parts.push(text);
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.dataset && el.dataset.tagKey) {
        parts.push(el.dataset.tagKey);
        return;
      }
      // Fallback: collect text content
      parts.push((el.textContent || '').replace(new RegExp(GAP_CHAR, 'g'), ''));
    }
  });
  return parts.join('');
}

function parseTemplateToNodes(template: string): (Text | HTMLElement)[] {
  if (!template) return [document.createTextNode('')];
  const result: (Text | HTMLElement)[] = [];
  let remaining = template;
  // Tags are like #...# – use known TAGS to split accurately
  const tagKeys = TAGS.map((t) => t.key).sort((a, b) => b.length - a.length);
  while (remaining.length > 0) {
    let matched = false;
    for (const key of tagKeys) {
      if (remaining.startsWith(key)) {
        result.push(createTagChip(key));
        result.push(document.createTextNode(GAP_CHAR));
        remaining = remaining.slice(key.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;
    // take next char as text until next tag match
    let nextIndex = -1;
    for (const key of tagKeys) {
      const idx = remaining.indexOf(key);
      if (idx !== -1)
        nextIndex = nextIndex === -1 ? idx : Math.min(nextIndex, idx);
    }
    const take = nextIndex === -1 ? remaining : remaining.slice(0, nextIndex);
    result.push(document.createTextNode(take));
    remaining = remaining.slice(take.length);
  }
  return result;
}

function createRemoveButton(): HTMLElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className =
    'hover:bg-settings-border-primary inline-flex size-4 items-center justify-center rounded';
  btn.setAttribute('data-action', 'remove');
  // render lucide XIcon into inline SVG
  const svg = renderToStaticMarkup(
    <XIcon className='size-3 opacity-70 hover:opacity-100' />,
  );
  btn.innerHTML = svg;
  return btn;
}

function createTagChip(tagKey: string): HTMLElement {
  const tag = TAGS.find((t) => t.key === tagKey);
  const chip = document.createElement('span');
  chip.className =
    'inline-flex items-center gap-1 rounded bg-settings-bg-tertiary ml-0.5 px-1 py-0.5 text-xs font-medium text-settings-text-primary border border-settings-border-secondary cursor-grab select-none';
  chip.draggable = true;
  chip.dataset.tagKey = tagKey;
  chip.setAttribute('contenteditable', 'false');
  const label = document.createElement('span');
  label.textContent = tag ? tag.desc : tagKey;
  chip.appendChild(label);
  chip.appendChild(createRemoveButton());
  return chip;
}

function placeCaretAfter(node: Node) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.setStartAfter(node);
  range.collapse(true);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function getDropPosition(
  container: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    null,
  );
  let bestNode: Node | null = null;
  let bestOffset = 0;
  let bestDistance = Infinity;
  while (walker.nextNode()) {
    let node = walker.currentNode;

    // Skip any nodes that are inside a chip
    if (node.nodeType === Node.TEXT_NODE) {
      const chip = (node.parentElement as HTMLElement)?.closest?.(
        '[data-tag-key]',
      ) as HTMLElement | null;
      if (chip && chip !== container) {
        // This text node is inside a chip, skip it
        continue;
      }
    }

    // Treat chips as atomic: if current is inside a chip, operate on the chip element itself
    if (node.nodeType === Node.ELEMENT_NODE) {
      const chip = (node as HTMLElement).closest(
        '[data-tag-key]',
      ) as HTMLElement | null;
      if (chip && chip !== container) {
        const rect = chip.getBoundingClientRect();
        const beforeDist = Math.abs(clientX - rect.left);
        const afterDist = Math.abs(clientX - rect.right);
        if (beforeDist < bestDistance) {
          bestDistance = beforeDist;
          bestNode = chip;
          bestOffset = 0; // before chip
        }
        if (afterDist < bestDistance) {
          bestDistance = afterDist;
          bestNode = chip;
          bestOffset = 1; // after chip
        }
        // Skip traversing chip's children further
        continue;
      }
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const range = document.createRange();
      const text = node as Text;
      for (let i = 0; i <= text.length; i++) {
        range.setStart(text, i);
        range.setEnd(text, i);
        const rect = range.getClientRects()[0];
        if (!rect) continue;
        const dx = clientX - rect.left;
        const dy = clientY - rect.top;
        const d = Math.abs(dx) + Math.abs(dy);
        if (d < bestDistance) {
          bestDistance = d;
          bestNode = text;
          bestOffset = i;
        }
      }
    } else if ((node as HTMLElement).dataset?.tagKey) {
      const rect = (node as HTMLElement).getBoundingClientRect();
      const beforeDist = Math.abs(clientX - rect.left);
      const afterDist = Math.abs(clientX - rect.right);
      if (beforeDist < bestDistance) {
        bestDistance = beforeDist;
        bestNode = node;
        bestOffset = 0; // before element
      }
      if (afterDist < bestDistance) {
        bestDistance = afterDist;
        bestNode = node;
        bestOffset = 1; // after element
      }
    }
  }
  return { node: bestNode, offset: bestOffset };
}

function getCaretRectForPosition(
  container: HTMLElement,
  node: Node | null,
  offset: number,
): DOMRect | null {
  const range = document.createRange();
  try {
    if (!node) {
      // end of container
      range.selectNodeContents(container);
      range.collapse(false);
      return range.getClientRects()[0] || null;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      range.setStart(node, Math.min(offset, (node as Text).length));
      range.collapse(true);
      return range.getClientRects()[0] || null;
    }
    const el = node as HTMLElement;
    if (offset === 0) {
      range.setStartBefore(el);
    } else {
      range.setStartAfter(el);
    }
    range.collapse(true);
    return range.getClientRects()[0] || null;
  } catch {
    return null;
  }
}

function selectionInsideChip(): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const anchor = sel.anchorNode as Node | null;
  const el =
    (anchor?.nodeType === Node.ELEMENT_NODE
      ? (anchor as HTMLElement)
      : (anchor?.parentElement as HTMLElement | null)) || null;
  return el ? (el.closest('[data-tag-key]') as HTMLElement | null) : null;
}

function normalizeInsertionOutsideChip() {
  const chip = selectionInsideChip();
  if (!chip) return;
  const range = document.createRange();
  range.setStartAfter(chip);
  range.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function getHashtagQueryAtCaret(): {
  node: Text;
  start: number;
  end: number;
  text: string;
} | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (range.startContainer.nodeType !== Node.TEXT_NODE) return null;
  const textNode = range.startContainer as Text;
  const caretOffset = range.startOffset;
  const text = textNode.data;
  // Search from caret to the left up to whitespace for the last '#'
  let left = caretOffset - 1;
  while (left >= 0 && !/\s/.test(text[left])) left--;
  const segmentStart = left + 1;
  const segment = text.slice(segmentStart, caretOffset);
  const hashIndexRel = segment.lastIndexOf('#');
  if (hashIndexRel === -1) return null;
  const start = segmentStart + hashIndexRel;
  const fragment = text.slice(start, caretOffset);
  return { node: textNode, start, end: caretOffset, text: fragment };
}

export const FilenameTemplateBuilder = memo(function FilenameTemplateBuilder({
  value,
  onChange,
  className,
}: FilenameTemplateBuilderProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const caretRef = useRef<HTMLDivElement | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestIndex, setSuggestIndex] = useState(0);
  const [suggestPos, setSuggestPos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [usedTags, setUsedTags] = useState<Set<string>>(new Set());

  // Initialize from value
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    // If external value changes, re-render DOM only if it differs
    const currentSerialized = serializeEditor(editor);
    const nextValue = value ?? '';
    if (currentSerialized === nextValue) return;
    editor.innerHTML = '';
    const nodes = parseTemplateToNodes(nextValue);
    nodes.forEach((n) => editor.appendChild(n));
    // update used
    const nextUsed = new Set<string>();
    editor.querySelectorAll<HTMLElement>('[data-tag-key]').forEach((el) => {
      nextUsed.add(el.dataset.tagKey!);
    });
    setUsedTags(nextUsed);
  }, [value]);

  const updateUsedTags = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextUsed = new Set<string>();
    editor.querySelectorAll<HTMLElement>('[data-tag-key]').forEach((el) => {
      nextUsed.add(el.dataset.tagKey!);
    });
    setUsedTags(nextUsed);
  }, []);

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const serialized = serializeEditor(editor);
    onChange?.(serialized);
    updateUsedTags();
  }, [onChange, updateUsedTags]);

  const hideCaret = useCallback(() => {
    const caret = caretRef.current;
    if (caret) {
      caret.style.display = 'none';
    }
  }, []);

  const showCaretAt = useCallback(
    (rect: DOMRect | null, container: HTMLElement) => {
      const caret = caretRef.current;
      if (!caret || !rect) return hideCaret();
      const containerRect = container.getBoundingClientRect();
      caret.style.display = 'block';
      caret.style.left = `${rect.left - containerRect.left}px`;
      caret.style.top = `${rect.top - containerRect.top}px`;
      caret.style.height = `${rect.height || 16}px`;
    },
    [hideCaret],
  );

  const handleInput = useCallback(() => {
    if (isComposing) return;
    emitChange();
    // Typeahead trigger and auto-convert if full tag typed
    normalizeInsertionOutsideChip();
    const q = getHashtagQueryAtCaret();
    if (q) {
      // if full tag key typed, convert
      const maybeFull = q.text + (q.text.endsWith('#') ? '' : '');
      const matched = TAGS.find(
        (t) =>
          t.key.startsWith(q.text) &&
          (q.text.endsWith('#') ? t.key === q.text : false),
      );
      if (matched) {
        const editor = editorRef.current!;
        const range = document.createRange();
        range.setStart(q.node, q.start);
        range.setEnd(q.node, q.end);
        range.deleteContents();
        const chip = createTagChip(matched.key);
        range.insertNode(chip);
        const gap = document.createTextNode(GAP_CHAR);
        chip.parentNode?.insertBefore(gap, chip.nextSibling);
        placeCaretAfter(chip);
        emitChange();
        setSuggestOpen(false);
        return;
      }
      // otherwise open suggest
      setSuggestQuery(q.text);
      setSuggestOpen(true);
      setSuggestIndex(0);
      // position near caret
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current) {
        const rect = sel.getRangeAt(0).getClientRects()[0];
        if (rect) {
          const containerRect = editorRef.current.getBoundingClientRect();
          setSuggestPos({
            left: rect.left - containerRect.left,
            top: rect.bottom - containerRect.top + 4,
          });
        }
      }
    } else {
      setSuggestOpen(false);
    }
  }, [emitChange, isComposing]);

  const insertWithGap = useCallback(
    (parentInsertion: (n: Node) => void, nodeToInsert: Node) => {
      parentInsertion(nodeToInsert);
      const gap = document.createTextNode(GAP_CHAR);
      if (nodeToInsert.parentNode) {
        nodeToInsert.parentNode.insertBefore(
          gap,
          (nodeToInsert as Node).nextSibling,
        );
      }
      placeCaretAfter(nodeToInsert);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const editor = editorRef.current;
      if (!editor) return;

      const tagKey = e.dataTransfer.getData('application/x-tag');
      const movingId = e.dataTransfer.getData('application/x-moving-id');

      const { node, offset } = getDropPosition(editor, e.clientX, e.clientY);

      const insertNode = (n: Node) => {
        if (!node) {
          editor.appendChild(n);
          insertWithGap(() => {}, n); // gap will be appended by insertWithGap
          return;
        }
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node as Text;
          const before = text.data.slice(0, offset);
          const after = text.data.slice(offset);
          const beforeNode = document.createTextNode(before);
          const afterNode = document.createTextNode(after);
          const parent = text.parentNode!;
          parent.insertBefore(beforeNode, text);
          parent.insertBefore(n, text);
          parent.insertBefore(afterNode, text);
          parent.removeChild(text);
          insertWithGap(() => {}, n);
          return;
        }
        const el = node as HTMLElement;
        if (el.dataset?.tagKey) {
          // prevent inserting inside chip: drop before/after only
          if (offset === 0) {
            el.parentNode?.insertBefore(n, el);
          } else {
            el.parentNode?.insertBefore(n, el.nextSibling);
          }
          insertWithGap(() => {}, n);
          return;
        }
        if (offset === 0) {
          el.parentNode?.insertBefore(n, el);
        } else {
          el.parentNode?.insertBefore(n, el.nextSibling);
        }
        insertWithGap(() => {}, n);
      };

      if (movingId) {
        const movingEl = document.querySelector(
          `[data-moving-id="${movingId}"]`,
        );
        if (movingEl && editor.contains(movingEl)) {
          const next = movingEl.nextSibling;
          const clone = movingEl.cloneNode(true);
          // remove original and its gap if exists
          const maybeGap =
            next &&
            next.nodeType === Node.TEXT_NODE &&
            (next.textContent || '').startsWith(GAP_CHAR)
              ? next
              : null;
          movingEl.parentNode?.removeChild(movingEl);
          if (maybeGap) maybeGap.parentNode?.removeChild(maybeGap);
          insertNode(clone);
          emitChange();
          return;
        }
      }

      if (tagKey) {
        const chip = createTagChip(tagKey);
        insertNode(chip);
        emitChange();
      }
      hideCaret();
    },
    [emitChange, hideCaret, insertWithGap],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const editor = editorRef.current;
      if (!editor) return;
      const { node, offset } = getDropPosition(editor, e.clientX, e.clientY);
      const rect = getCaretRectForPosition(editor, node, offset);
      showCaretAt(rect, editor);
    },
    [showCaretAt],
  );

  const handleDragLeave = useCallback(() => {
    hideCaret();
  }, [hideCaret]);

  // Make in-editor chips draggable/movable and removable
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleDragStart = (ev: DragEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target?.dataset?.tagKey) return;
      const movingId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      target.dataset.movingId = movingId;
      target.classList.add('opacity-60');
      target.classList.add('cursor-grabbing');
      ev.dataTransfer?.setData('application/x-moving-id', movingId);
      ev.dataTransfer?.setData('application/x-tag', target.dataset.tagKey);
      ev.dataTransfer!.effectAllowed = 'move';
    };

    const handleDragEnd = (ev: DragEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target?.dataset?.tagKey) return;
      target.classList.remove('opacity-60');
      target.classList.remove('cursor-grabbing');
    };

    const handleClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement;
      const btn = target.closest(
        'button[data-action="remove"]',
      ) as HTMLElement | null;
      if (!btn) return;
      const chip = btn.closest('[data-tag-key]') as HTMLElement | null;
      if (!chip) return;
      const next = chip.nextSibling;
      chip.parentNode?.removeChild(chip);
      // remove gap after chip if present
      if (
        next &&
        next.nodeType === Node.TEXT_NODE &&
        (next.textContent || '').startsWith(GAP_CHAR)
      ) {
        next.parentNode?.removeChild(next);
      }
      emitChange();
    };

    editor.addEventListener('dragstart', handleDragStart);
    editor.addEventListener('dragend', handleDragEnd);
    editor.addEventListener('click', handleClick);
    return () => {
      editor.removeEventListener('dragstart', handleDragStart);
      editor.removeEventListener('dragend', handleDragEnd);
      editor.removeEventListener('click', handleClick);
    };
  }, [emitChange]);

  // Palette
  const palette = useMemo(() => TAGS, []);
  const availablePalette = useMemo(
    () => palette.filter((t) => !usedTags.has(t.key)),
    [palette, usedTags],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    // Ensure only plain text is pasted
    e.preventDefault();
    normalizeInsertionOutsideChip();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!suggestOpen) return [] as typeof TAGS;
    if (!suggestQuery.startsWith('#')) return [] as typeof TAGS;
    return TAGS.filter((t) => t.key.startsWith(suggestQuery));
  }, [suggestOpen, suggestQuery]);

  const applySuggestion = useCallback(
    (tagKey: string) => {
      const q = getHashtagQueryAtCaret();
      if (!q) return;
      const range = document.createRange();
      range.setStart(q.node, q.start);
      range.setEnd(q.node, q.end);
      range.deleteContents();
      const chip = createTagChip(tagKey);
      range.insertNode(chip);
      const gap = document.createTextNode(GAP_CHAR);
      chip.parentNode?.insertBefore(gap, chip.nextSibling);
      placeCaretAfter(chip);
      emitChange();
      setSuggestOpen(false);
    },
    [emitChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!suggestOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestIndex(
          (i) => (i + 1) % Math.max(1, filteredSuggestions.length),
        );
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestIndex(
          (i) =>
            (i - 1 + Math.max(1, filteredSuggestions.length)) %
            Math.max(1, filteredSuggestions.length),
        );
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const chosen = filteredSuggestions[suggestIndex];
        if (chosen) applySuggestion(chosen.key);
      }
      if (e.key === 'Escape') {
        setSuggestOpen(false);
      }
    },
    [applySuggestion, filteredSuggestions, suggestIndex, suggestOpen],
  );

  return (
    <div className={cn('w-full', className)}>
      <div className='relative'>
        <div
          ref={editorRef}
          className='text-settings-text-primary border-settings-border-secondary bg-settings-bg-primary min-h-[38px] w-full rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500'
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => {
            setIsComposing(false);
            emitChange();
          }}
          aria-label='Шаблон имени файла'
        />
        <div
          ref={caretRef}
          className='bg-link-color pointer-events-none absolute hidden w-0.5'
          style={{ display: 'none' }}
        />
        {suggestOpen && filteredSuggestions.length > 0 && (
          <div
            className='border-settings-border-secondary bg-settings-background-primary text-settings-text-primary absolute z-10 min-w-[160px] overflow-hidden rounded border shadow'
            style={{ left: suggestPos?.left ?? 0, top: suggestPos?.top ?? 0 }}
          >
            {filteredSuggestions.map((t, idx) => (
              <button
                key={t.key}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-2 py-1 text-left text-xs',
                  idx === suggestIndex
                    ? 'bg-link-color text-foreground'
                    : 'hover:bg-settings-border-primary',
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySuggestion(t.key);
                }}
              >
                <span>{t.desc}</span>
                <span className='text-foreground-secondary'>{t.key}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className='text-settings-text-tertiary my-2 text-sm text-balance'>
        Перетаскивайте теги из списка или кликайте по ним для вставки. Вы можете
        смешивать текст и теги и менять их порядок. Введите '#' для выбора тега.
      </p>
      <div className='my-2 flex flex-wrap items-center gap-2'>
        {availablePalette.map((t) => (
          <button
            key={t.key}
            className='bg-settings-bg-tertiary text-settings-text-primary border-settings-border-secondary inline-flex cursor-grab items-center gap-1 rounded border px-2 py-1 text-xs font-medium select-none'
            draggable
            onDragStart={(e) => {
              e.currentTarget.style.opacity = '0.8';
              e.currentTarget.style.cursor = 'grabbing';
              e.dataTransfer.setData('application/x-tag', t.key);
              e.dataTransfer.effectAllowed = 'copyMove';
            }}
            onDragEnd={(e) => {
              e.currentTarget.style.opacity = '';
              e.currentTarget.style.cursor = '';
            }}
            onClick={(e) => {
              e.preventDefault();
              normalizeInsertionOutsideChip();
              const editor = editorRef.current;
              if (!editor) return;
              const chip = createTagChip(t.key);
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(chip);
                const gap = document.createTextNode(GAP_CHAR);
                chip.parentNode?.insertBefore(gap, chip.nextSibling);
                placeCaretAfter(chip);
              } else {
                editor.appendChild(chip);
                const gap = document.createTextNode(GAP_CHAR);
                editor.appendChild(gap);
                placeCaretAfter(chip);
              }
              emitChange();
            }}
            title={t.key}
          >
            <span>{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
