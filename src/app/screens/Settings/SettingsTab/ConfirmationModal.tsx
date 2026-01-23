import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

const confirmState = {
  isOpen: false,
  options: null as ConfirmOptions | null,
  resolve: null as ((value: boolean) => void) | null,
  listeners: new Set<() => void>(),
};

function subscribe(callback: () => void) {
  confirmState.listeners.add(callback);
  return () => {
    confirmState.listeners.delete(callback);
  };
}

function notify() {
  confirmState.listeners.forEach((listener) => listener());
}

export function confirmRequest(options: ConfirmOptions): Promise<boolean> {
  confirmState.options = options;
  confirmState.isOpen = true;
  notify();

  return new Promise((resolve) => {
    confirmState.resolve = resolve;
  });
}

export function ConfirmationModal() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return subscribe(() => forceUpdate({}));
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && confirmState.isOpen) {
        handleCancel();
      }
    };

    if (confirmState.isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      root.inert = true;
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      root.inert = false;
    };
  }, [confirmState.isOpen]);

  const handleConfirm = async () => {
    if (confirmState.options?.onConfirm) {
      await confirmState.options.onConfirm();
    }
    confirmState.isOpen = false;
    if (confirmState.resolve) {
      confirmState.resolve(true);
    }
    notify();
  };

  const handleCancel = () => {
    if (confirmState.options?.onCancel) {
      confirmState.options.onCancel();
    }
    confirmState.isOpen = false;
    if (confirmState.resolve) {
      confirmState.resolve(false);
    }
    notify();
  };

  if (!confirmState.isOpen || !confirmState.options) {
    return null;
  }

  const options = confirmState.options;

  return createPortal(
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'
      onClick={handleCancel}
    >
      <div
        className='bg-settings-background-secondary border-settings-border-primary mx-4 w-full max-w-lg overflow-hidden rounded-lg border shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='border-settings-border-primary flex items-start justify-between border-b px-6 py-4'>
          <div className='flex items-center gap-3'>
            <h3 className='text-settings-text-primary text-lg font-bold text-balance'>
              {options.title}
            </h3>
          </div>
          <Button variant='ghost' size='square' onClick={handleCancel}>
            <X className='h-5 w-5' />
          </Button>
        </div>

        {options.description && (
          <div className='border-settings-border-primary border-b px-6 py-4'>
            <p className='text-settings-text-secondary text-sm text-balance opacity-80'>
              {options.description}
            </p>
          </div>
        )}

        <div className='bg-settings-background-tertiary flex items-center justify-end gap-3 px-6 py-4'>
          <Button onClick={handleCancel} variant='outline'>
            {options.cancelText ||
              browser.i18n.getMessage('settings_modal_cancel')}
          </Button>
          <Button onClick={handleConfirm}>
            {options.confirmText ||
              browser.i18n.getMessage('settings_modal_confirm')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
