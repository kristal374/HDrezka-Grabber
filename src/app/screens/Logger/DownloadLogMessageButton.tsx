import { Button } from '@/components/ui/Button';
import pako from 'pako';
import { useCallback } from 'react';
import { toast, Toaster } from 'sonner';

export function Logger() {
  const downloadFileLogs = useCallback(() => {
    const startDownloadLog = async () => {
      const data = await indexedDBObject.getAll('logStorage');

      const json = JSON.stringify(data);
      const gzipped = pako.gzip(json);
      let blob: Blob = new Blob([gzipped], { type: 'application/gzip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'data.json.gz';
      a.click();
      URL.revokeObjectURL(url);
    };
    toast.promise(startDownloadLog(), {
      loading: 'Подготавливаем отчёт для загрузки...',
      success: () => 'Журнал событий загружен.',
      error: (e) => {
        console.error(e);
        return 'Произошёл непредвиденный сбой, при попытке сформировать отчёт';
      },
    });
  }, []);

  return (
    <>
      <Toaster
        position='bottom-right'
        expand={true}
        richColors
        duration={10_000} // ms
        theme={settings.darkMode ? 'light' : 'dark'}
      />
      <Button onClick={downloadFileLogs}>Button</Button>
    </>
  );
}
