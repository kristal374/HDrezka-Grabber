import { useEffect } from 'react';
import { Combobox } from '../../../components/Combobox';
import {
  Message,
  QualitiesList,
  QualityItem,
  URLsContainer,
} from '../../../lib/types';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  selectCurrentQuality,
  selectQualitiesList,
  selectQualitiesSizes,
  setCurrentQualityAction,
} from './QualitySelector.slice';

async function getQualitiesSizes(qualitiesList: QualitiesList) {
  return await browser.runtime
    .sendMessage<Message<QualitiesList>>({
      type: 'getFileSize',
      message: qualitiesList,
    })
    .then((response) => {
      return response as URLsContainer | null;
    });
}

export function QualitySelector() {
  const dispatch = useAppDispatch();
  const quality = useAppSelector((state) => selectCurrentQuality(state));
  const qualitiesList = useAppSelector((state) => selectQualitiesList(state));
  const qualitiesSizes = useAppSelector((state) => selectQualitiesSizes(state));

  useEffect(() => {
    // if (!qualitiesList || qualitiesSizes !== null) return;
    // getQualitiesSizes(qualitiesList).then((result) => {
    //   dispatch(setQualitiesSizesAction({ qualitiesSizes: result }));
    // }); // TODO: Вернуть в проде
  }, [qualitiesList]);

  if (!qualitiesList) return null;
  logger.info('New render QualitySelector component.');

  return (
    <div className='flex items-center gap-2.5'>
      <label htmlFor='qualities' className='ml-auto text-sm'>
        {browser.i18n.getMessage('popup_quality')}
      </label>
      <Combobox
        id='qualities'
        value={quality || Object.keys(qualitiesList).at(-1)}
        onValueChange={(v) =>
          dispatch(setCurrentQualityAction({ quality: v as QualityItem }))
        }
        data={Object.keys(qualitiesList).map((q) => ({
          value: q,
          label: (
            <>
              {q}
              {qualitiesSizes && (
                // @ts-ignore
                <span className='ml-auto'>{qualitiesSizes[q].stringSize}</span>
              )}
            </>
          ),
        }))}
      />
    </div>
  );
}
