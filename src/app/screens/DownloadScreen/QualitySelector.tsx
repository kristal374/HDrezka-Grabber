import { Combobox } from '../../../components/Combobox';
import { useQualities } from '../../hooks/useQualities';
import { useQualitySize } from '../../hooks/useQualitySize';
import type { QualityItem, QualityRef } from '../../../lib/types';
import { Ref, useImperativeHandle, useState } from 'react';

type Props = {
  qualityRef: Ref<QualityRef>;
};

export function QualitySelector({ qualityRef }: Props) {
  const [quality, setQuality] = useState<QualityItem>('360p');
  const [streams, setStreams] = useState<string | undefined>();
  const qualitiesList = useQualities(streams, setQuality);
  // const [sizes, setSizes] = useQualitySize(qualitiesList); // TODO: вернуть в проде
  const [sizes, setSizes] = useQualitySize(null);

  useImperativeHandle(
    qualityRef,
    () => ({
      quality: quality,
      setStreams: (stream) => {
        setSizes(null);
        setStreams(stream);
      },
    }),
    [quality],
  );

  if (!qualitiesList) return null;

  return (
    <div className='flex items-center gap-2.5'>
      <label htmlFor='qualities' className='ml-auto text-sm'>
        {browser.i18n.getMessage('popup_quality')}
      </label>
      <Combobox
        id='qualities'
        value={quality}
        onValueChange={(v) => setQuality(v as QualityItem)}
        data={Object.keys(qualitiesList).map((q) => ({
          value: q,
          label: (
            <>
              {q}
              {/* @ts-ignore */}
              {sizes && <span className='ml-auto'>{sizes[q]!.size}</span>}
            </>
          ),
        }))}
      />
    </div>
  );
}
