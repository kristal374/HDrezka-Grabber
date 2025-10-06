import { OutsideLink } from '@/components/OutsideLink';
import { AlertCircle, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

function AddSitesModal({
  isOpen,
  onClose,
  onAdd,
  existingSites,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (sites: string[]) => void;
  existingSites: string[];
}) {
  const [inputValue, setInputValue] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleAdd = () => {
    const lines = inputValue
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line);

    if (lines.length === 0) {
      setErrors(['Введите хотя бы один URL']);
      return;
    }

    const results: string[] = [];
    const newErrors: string[] = [];

    lines.forEach((line, index) => {
      if (!URL.canParse(line)) {
        newErrors.push(`Строка ${index + 1}: Некорректный URL "${line}"`);
      } else if (!existingSites.includes(line) && !results.includes(line)) {
        results.push(line);
      }
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    onAdd(results);
    setInputValue('');
    setErrors([]);
    onClose();
  };

  const handleClose = () => {
    setInputValue('');
    setErrors([]);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleAdd();
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'
      onClick={handleClose}
    >
      <div
        className='bg-settings-background-secondary border-settings-border-primary mx-4 w-full max-w-2xl overflow-hidden rounded-lg border shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='border-settings-border-primary flex items-center justify-between border-b px-6 py-4'>
          <h3 className='text-settings-text-primary text-lg font-semibold'>
            Добавить новые сайты
          </h3>
          <button
            onClick={handleClose}
            className='text-settings-text-tertiary hover:text-settings-text-primary hover:bg-settings-background-tertiary rounded-md p-1 transition-colors'
          >
            <X className='size-5' />
          </button>
        </div>

        <div className='space-y-4 p-6'>
          <div>
            <textarea
              id='input-sites'
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setErrors([]);
              }}
              onKeyDown={handleKeyDown}
              placeholder='https://rezka.ag&#10;http://hdrezka.ag'
              rows={8}
              className='border-settings-border-primary bg-settings-background-primary text-settings-text-primary placeholder-settings-text-tertiary focus:border-settings-border-tertiary focus:ring-settings-border-tertiary/20 w-full resize-none rounded-lg border px-4 py-3 font-mono text-sm focus:ring-2 focus:outline-none'
              autoFocus
            />
            <p className='text-settings-text-tertiary mt-2 text-xs'>
              Ctrl+Enter что бы сохранить.
            </p>
          </div>

          {errors.length > 0 && (
            <div className='max-h-32 space-y-1 overflow-y-auto rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3'>
              {errors.map((error, index) => (
                <div
                  key={index}
                  className='flex items-start gap-2 text-sm text-red-400'
                >
                  <AlertCircle className='mt-0.5 size-4 flex-shrink-0' />
                  <span>{error}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='border-settings-border-primary bg-settings-background-tertiary flex items-center justify-end gap-3 border-t px-6 py-4'>
          <button
            onClick={handleClose}
            className='border-settings-border-primary bg-settings-background-secondary text-settings-text-primary hover:bg-settings-background-tertiary rounded-md border px-4 py-2 text-sm font-medium transition-colors'
          >
            Отмена
          </button>
          <button
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className='bg-link-color rounded-md px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50'
          >
            Добавить сайты
          </button>
        </div>
      </div>
    </div>
  );
}

export function AllowedSitesList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const allowedSites = permissions.origins ?? [];

  const requiredSites = useMemo(() => {
    return browser.runtime.getManifest().host_permissions ?? [];
  }, []);

  const handleAddSites = (newSites: string[]) => {
    browser.permissions
      .request({
        origins: newSites.map((site) => `*://${new URL(site).host}/*`),
      })
      .then();
  };

  const handleRemoveSite = (urlToRemove: string) => {
    browser.permissions.remove({ origins: [urlToRemove] }).then();
  };

  return (
    <>
      <div className='flex flex-col gap-3'>
        <div className='flex items-center justify-between'>
          <h3 className='text-settings-text-secondary block text-sm font-medium'>
            Сайты к которым расширение имеет доступ ({allowedSites.length})
          </h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className='bg-link-color hover:bg-link-color/75 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors'
          >
            <Plus className='size-4' />
            Добавить новый сайт
          </button>
        </div>

        {allowedSites.length === 0 ? (
          <div className='px-4 py-8 text-center'>
            <p className='text-settings-text-tertiary text-sm'>
              Список пуст. Добавьте первый сайт
            </p>
          </div>
        ) : (
          allowedSites.map((site, index) => (
            <div
              key={index}
              className='border-settings-border-secondary bg-settings-background-secondary flex items-center justify-between gap-3 rounded-md border px-3 py-2.5'
            >
              <OutsideLink
                url={site.replace(/.*:\/\/(.+)\/.+/, `https://$1/`)}
                className='flex-1 text-sm break-all'
              />

              {!requiredSites.includes(site) && (
                <button
                  onClick={() => handleRemoveSite(site)}
                  className='text-settings-text-tertiary group/trash flex-shrink-0 rounded-md p-1.5 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400'
                  aria-label='Удалить сайт'
                  title='Удалить сайт'
                >
                  <Trash2 className='size-4 transition-transform duration-200 group-hover/trash:scale-110 group-active/trash:scale-95' />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <AddSitesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddSites}
        existingSites={allowedSites}
      />
    </>
  );
}
