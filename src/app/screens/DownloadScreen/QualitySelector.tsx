import { Combobox } from '../../../components/Combobox';
import { useQualitySize } from '../../hooks/useQualitySize';
import type { QualityItem, QualityRef } from '../../../lib/types';
import { QualitiesList } from '../../../lib/types';
import { Ref, useEffect, useImperativeHandle, useState } from 'react';
import { decodeVideoURL } from '../../../lib/link-processing';

type Props = {
  qualityRef: Ref<QualityRef>;
};

export function QualitySelector({ qualityRef }: Props) {
  const [streams, setStreams] = useState<string | undefined>();
  const [quality, setQuality] = useState<QualityItem>('360p');
  const [qualitiesList, setQualitiesList] = useState<QualitiesList | null>(
    null,
  );
  // const [sizes, setSizes] = useQualitySize(qualitiesList); // TODO: вернуть в проде
  const [sizes, setSizes] = useQualitySize(null);

  useEffect(() => {
    if (!streams) return;
    const response = decodeVideoURL(streams) as QualitiesList;
    setQualitiesList(response);
    const qualities = Object.keys(response) as QualityItem[];
    setQuality(qualities.at(-1) || null);
  }, [streams]);

  useImperativeHandle(
    qualityRef,
    () => ({
      quality: quality,
      setStreams: (stream) => {
        setSizes(null);
        logger.debug('Set new streams value:', { value: stream });
        setStreams(stream);
      },
    }),
    [quality],
  );

  if (!qualitiesList) return null;
  logger.info('New render QualitySelector component.');

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
