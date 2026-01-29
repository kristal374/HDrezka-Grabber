import type { LogMessageWithId } from '@/app/hooks/logger/useUpdateLogArray';
import { Button } from '@/components/ui/Button';
import { DownloadIcon } from 'lucide-react';
import pako from 'pako';
import { useState } from 'react';
import { toast } from 'sonner';

type Props = {
  dataStore: React.RefObject<LogMessageWithId[]>;
};

export function DownloadLogsButton({ dataStore }: Props) {
  const [loading, setLoading] = useState(false);
  const downloadLogsFile = () => {
    const startDownloadLog = async () => {
      setLoading(true);
      // const data = await indexedDBObject.getAll('logStorage');
      const data = dataStore.current;

      const json = JSON.stringify(data);
      const gzipped = pako.gzip(json);
      let blob: Blob = new Blob([gzipped], { type: 'application/gzip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extName = browser.runtime.getManifest().name.replaceAll(/\s/g, '-');
      const time = new Date().toISOString().replaceAll(/[:.,]/g, '-');
      a.download = `${extName}-logs-${time}.json.gz`;
      a.click();
      URL.revokeObjectURL(url);
      setLoading(false);
    };
    toast.promise(startDownloadLog(), {
      loading: browser.i18n.getMessage('logger_downloadLogs_loading'),
      success: browser.i18n.getMessage('logger_downloadLogs_success'),
      error: (e) => {
        console.error(e);
        return browser.i18n.getMessage('logger_downloadLogs_error');
      },
    });
  };

  return (
    <Button onClick={downloadLogsFile} disabled={loading}>
      <DownloadIcon className='size-4' />
      {browser.i18n.getMessage('logger_downloadLogs_button')}
    </Button>
  );
}
