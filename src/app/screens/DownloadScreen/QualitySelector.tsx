import { Combobox } from '../../../components/Combobox';
import { useQualities } from '../../hooks/useQualities';
import { useQualitySize } from '../../hooks/useQualitySize';
import type { FilmInfo, QualityItem, SerialInfo } from '../../../lib/types';
import { useState } from 'react';

type Props = {
  movieInfo: FilmInfo | SerialInfo;
};

export function QualitySelector({ movieInfo }: Props) {
  const qualities = useQualities(movieInfo);
  // const sizes = useQualitySize(qualities); // TODO: вернуть в проде
  const sizes = useQualitySize(null);
  const [quality, setQuality] = useState<QualityItem>('720p');

  if (!qualities) return null;

  return (
    <div className='flex items-center gap-2.5'>
      <label htmlFor='qualities' className='ml-auto text-sm'>
        {browser.i18n.getMessage('popup_quality')}
      </label>
      <Combobox
        id='qualities'
        value={quality}
        onValueChange={(v) => setQuality(v as QualityItem)}
        data={Object.keys(qualities).map((q) => ({
          value: q,
          label: (
            <>
              {q}
              {sizes && <span className='ml-auto'>{sizes[q]!.size}</span>}
            </>
          ),
        }))}
      />
    </div>
  );
}