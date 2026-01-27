import type { LogMessageWithId } from '@/app/hooks/logger/useUpdateLogArray';
import { Button } from '@/components/ui/Button';
import { UploadIcon } from 'lucide-react';
import pako from 'pako';
import { useRef } from 'react';

export interface UploadFileData {
  name: string;
  data: LogMessageWithId[];
}

type Props = {
  setFile: React.Dispatch<React.SetStateAction<UploadFileData | null>>;
  onFileUploaded?: (data: LogMessageWithId[]) => void;
};

export function UploadLogsButton({ setFile, onFileUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const arrayBuffer = await files[0].arrayBuffer();
    const json = pako.ungzip(arrayBuffer, { to: 'string' });
    const data = JSON.parse(json) as LogMessageWithId[];
    setFile({ name: files[0].name, data });
    onFileUploaded?.(data);
    inputRef.current!.value = '';
  };
  return (
    <Button
      variant='secondary'
      onClick={() => {
        inputRef.current?.click();
      }}
    >
      <UploadIcon className='size-4' />
      Upload logs from file
      <input
        ref={inputRef}
        type='file'
        hidden
        accept={'.json.gz'}
        multiple={false}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </Button>
  );
}
