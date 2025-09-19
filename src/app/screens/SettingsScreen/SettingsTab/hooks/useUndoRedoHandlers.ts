import { useCallback, useEffect, useState } from 'react';

enum ChangeType {
  INSERT = 'insert',
  DELETE = 'delete',
  REPLACE = 'replace',
}

type Position = {
  start: number;
  end: number;
};

type Change = {
  type: ChangeType;
  position: Position;
  content: string;
  timestamp: number;
};

class HistoryManager {
  private history: Change[] = [];
  private currentIndex = -1;

  private readonly maxHistorySize = 50;
  private readonly maxMergeTime = 1000;

  private getChangeType(oldValue: string, newValue: string) {
    if (!oldValue && newValue) return ChangeType.INSERT;
    if (oldValue && !newValue) return ChangeType.DELETE;
    if (oldValue.length < newValue.length) return ChangeType.INSERT;
    if (oldValue.length > newValue.length) return ChangeType.DELETE;
    return ChangeType.REPLACE;
  }

  private canMergeChanges(change1: Change, change2: Change): boolean {
    if (change1.type !== change2.type) return false;
    return change2.timestamp - change1.timestamp <= this.maxMergeTime;
  }

  private mergeChanges(change1: Change, change2: Change): Change | null {
    if (!this.canMergeChanges(change1, change2)) return null;
    return change2;
  }

  public addNewChange(newContent: string, cursorPosition: Position): void {
    const previousChange = this.history[this.currentIndex];

    if (
      previousChange?.content === newContent ||
      (!previousChange && !newContent)
    )
      return;
    const newChange: Change = {
      type: this.getChangeType(previousChange?.content, newContent),
      position: cursorPosition,
      content: newContent,
      timestamp: previousChange ? Date.now() : 0,
    };

    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    if (previousChange) {
      const mergedChange = this.mergeChanges(previousChange, newChange);
      if (mergedChange) {
        this.history[this.currentIndex] = mergedChange;
        return;
      }
    }

    this.history.push(newChange);
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(
        this.history.length - this.maxHistorySize,
      );
    } else {
      this.currentIndex++;
    }
  }

  public undo(): Change | null {
    if (this.currentIndex >= 0 && this.history.length > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }

  public redo(): Change | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }
}

export function useUndoRedoHandlers(
  value: string,
  setValue: React.Dispatch<React.SetStateAction<string>>,
  inputRef: React.RefObject<HTMLTextAreaElement | null>,
) {
  const [historyManager] = useState(() => new HistoryManager());

  useEffect(() => {
    const cursorPosition: Position = {
      start: inputRef.current!.selectionStart,
      end: inputRef.current!.selectionEnd,
    };
    historyManager.addNewChange(value, cursorPosition);
  }, [inputRef, value]);

  const setCursorPosition = useCallback(
    (newCursorPosition: Position) => {
      setTimeout(() => {
        inputRef.current!.setSelectionRange(
          newCursorPosition.start,
          newCursorPosition.end,
        );
        inputRef.current!.focus();
      }, 0);
    },
    [inputRef],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        const isUndo = event.code === 'KeyZ' && !event.shiftKey;
        const isRedo =
          (event.code === 'KeyZ' && event.shiftKey) || event.code === 'KeyY';
        const typeEvent = isUndo ? 'undo' : isRedo ? 'redo' : null;

        if (!typeEvent) return;
        event.preventDefault();

        const newValue =
          typeEvent === 'undo' ? historyManager.undo() : historyManager.redo();
        if (newValue) {
          setValue(newValue.content);
          setCursorPosition(newValue.position);
        }
      }
    },
    [value, setValue],
  );

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.addEventListener('keydown', handleKeyDown);

    return () => {
      input.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputRef, value, setValue]);
}
