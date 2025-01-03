import { Combobox } from '../../../components/Combobox';
import { useQualities } from '../../hooks/useQualities';
import { useQualitySize } from '../../hooks/useQualitySize';
import type { FilmInfo, QualityItem, SerialInfo } from '../../../lib/types';
import { Ref, useEffect, useImperativeHandle, useState } from "react";


type Props = {
  streams: string | undefined;
  ref: Ref<any>;
};

export function QualitySelector({ streams, ref }: Props) {
  const qualities = useQualities(streams);
  // const sizes = useQualitySize(qualities); // TODO: вернуть в проде
  const sizes = useQualitySize(null);
  const [quality, setQuality] = useState<QualityItem>('720p');

  useImperativeHandle(ref, () => ({
    getQuality: () => quality,
  }));

  useEffect(() => {
    console.log(streams?.slice(0, 10));
  }, [streams]);

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
              {/* @ts-ignore */}
              {sizes && <span className='ml-auto'>{sizes[q]!.size}</span>}
            </>
          ),
        }))}
      />
    </div>
  );
}
