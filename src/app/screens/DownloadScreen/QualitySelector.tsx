import { Ref, useEffect, useImperativeHandle } from 'react';
import { Combobox } from '../../../components/Combobox';
import { decodeVideoURL } from '../../../lib/link-processing';
import type { QualityItem, QualityRef } from '../../../lib/types';
import { QualitiesList } from '../../../lib/types';
import { useQualitySize } from '../../hooks/useQualitySize';
import { useStorage } from '../../hooks/useStorage';

type Props = {
  qualityRef: Ref<QualityRef>;
};

export function QualitySelector({ qualityRef }: Props) {
  const [streams, setStreams] = useStorage<string | undefined>(
    'streams',
    undefined,
  );
  const [quality, setQuality] = useStorage<QualityItem>('quality', '360p');
  const [qualitiesList, setQualitiesList] = useStorage<QualitiesList | null>(
    'qualitiesList',
    null,
  );
  // const [sizes, setSizes] = useQualitySize(qualitiesList); // TODO: вернуть в проде
  const [sizes, setSizes] = useQualitySize(null);

  useEffect(() => {
    if (!streams) return;
    const response = decodeVideoURL(streams) as QualitiesList;
    setQualitiesList(response);
    const qualities = Object.keys(response) as QualityItem[];
    setQuality(qualities.at(-1) || '360p');
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
              {sizes && <span className='ml-auto'>{sizes[q].stringSize}</span>}
            </>
          ),
        }))}
      />
    </div>
  );
}
