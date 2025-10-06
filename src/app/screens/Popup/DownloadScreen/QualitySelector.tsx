import { Combobox } from '@/components/Combobox';
import { sortQualityItem } from '@/lib/link-processing';
import { Message, QualityItem, URLItem } from '@/lib/types';
import equal from 'fast-deep-equal/es6';
import { useCallback, useEffect } from 'react';
import {
  addQualityInfoAction,
  selectCurrentQuality,
  selectQualitiesList,
  selectQualityInfo,
  setCurrentQualityAction,
} from './store/QualitySelector.slice';
import { useAppDispatch, useAppSelector } from './store/store';

export function QualitySelector() {
  const dispatch = useAppDispatch();
  const quality = useAppSelector((state) => selectCurrentQuality(state));
  const qualitiesList = useAppSelector((state) => selectQualitiesList(state));
  const qualitiesInfo = useAppSelector((state) => selectQualityInfo(state));

  const getQualitySize = useCallback(async (urls: string[]) => {
    return (await browser.runtime.sendMessage<Message<string[]>>({
      type: 'getFileSize',
      message: urls,
    })) as URLItem;
  }, []);

  useEffect(() => {
    if (
      !qualitiesList ||
      !equal(qualitiesInfo, {}) ||
      !settings.displayQualitySize
    )
      return;

    let ignore = false;
    for (const [key, value] of Object.entries(qualitiesList)) {
      getQualitySize(value).then((response) => {
        if (!ignore) {
          dispatch(
            addQualityInfoAction({
              qualityInfo: { [key as QualityItem]: response },
            }),
          );
        }
      });
    }
    return () => {
      ignore = true;
    };
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
        width={229.588}
        value={quality || Object.keys(qualitiesList).at(-1)}
        onValueChange={(v) =>
          dispatch(setCurrentQualityAction({ quality: v as QualityItem }))
        }
        data={Object.keys(sortQualityItem(qualitiesList)).map((q) => ({
          value: q,
          label: q,
          labelComponent({ children }) {
            const targetQuality = q as QualityItem;
            return (
              <>
                {children}
                {qualitiesInfo &&
                  qualitiesInfo[targetQuality] &&
                  settings.displayQualitySize && (
                    <span className='ml-auto'>
                      {qualitiesInfo[targetQuality].stringSize}
                    </span>
                  )}
              </>
            );
          },
        }))}
      />
    </div>
  );
}
