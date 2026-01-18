import { selectMovieInfo } from '@/app/screens/Popup/DownloadScreen/store/DownloadScreen.slice';
import { AnimatedLoaderIcon } from '@/components/icons/AnimatedLoaderIcon';
import { Combobox } from '@/components/ui/Combobox';
import { sortQualityItem } from '@/lib/link-processing';
import { Message, QualityItem, RequestUrlSize, URLItem } from '@/lib/types';
import { formatBytes } from '@/lib/utils';
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
  const movieInfo = useAppSelector(selectMovieInfo)!;

  const quality = useAppSelector((state) => selectCurrentQuality(state));
  const qualitiesList = useAppSelector((state) => selectQualitiesList(state));
  const qualitiesInfo = useAppSelector((state) => selectQualityInfo(state));

  const getQualitySize = useCallback(async (urls: string[]) => {
    return (await browser.runtime.sendMessage<Message<RequestUrlSize>>({
      type: 'getFileSize',
      message: { urlsList: urls, siteUrl: movieInfo.url },
    })) as URLItem;
  }, []);

  useEffect(() => {
    const needToUpdate = settings.displayQualitySize || settings.getRealQuality;
    if (!qualitiesList || !needToUpdate) return;

    let ignore = false;
    for (const [key, value] of Object.entries(qualitiesList)) {
      const qualityItem = key as QualityItem;
      const qualityInfo = qualitiesInfo?.[qualityItem] ?? null;
      if (
        (qualityInfo?.fileSize || !settings.displayQualitySize) &&
        (qualityInfo?.videoResolution || !settings.getRealQuality)
      )
        continue;

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
      <label htmlFor='qualities' className='ml-auto text-sm select-none'>
        {browser.i18n.getMessage('popup_quality')}
      </label>
      <Combobox
        id='qualities'
        width='14.4rem'
        value={quality || Object.keys(qualitiesList).at(-1)}
        onValueChange={(v) =>
          dispatch(setCurrentQualityAction({ quality: v as QualityItem }))
        }
        data={Object.keys(sortQualityItem(qualitiesList)).map((q) => ({
          value: q,
          label: q,
          labelComponent({ children }) {
            const targetQuality = q as QualityItem;
            const qualityInfo = qualitiesInfo?.[targetQuality] ?? null;
            const videoResolution = qualityInfo?.videoResolution ?? null;
            const realQuality = `${videoResolution?.height}p`;
            return (
              <>
                {qualityInfo && settings.getRealQuality
                  ? videoResolution && targetQuality !== realQuality
                    ? `${targetQuality} (${realQuality})`
                    : targetQuality
                  : children}
                {settings.displayQualitySize ? (
                  <span className='ml-auto'>
                    {qualityInfo ? (
                      formatBytes(qualityInfo.fileSize)
                    ) : (
                      <AnimatedLoaderIcon className='size-4' />
                    )}
                  </span>
                ) : undefined}
              </>
            );
          },
        }))}
      />
    </div>
  );
}
