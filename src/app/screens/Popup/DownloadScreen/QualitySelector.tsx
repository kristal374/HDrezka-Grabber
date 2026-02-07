import { selectMovieInfo } from '@/app/screens/Popup/DownloadScreen/store/DownloadScreen.slice';
import { AnimatedLoaderIcon } from '@/components/icons/AnimatedLoaderIcon';
import { Combobox } from '@/components/ui/Combobox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import { sortQualityItem } from '@/lib/link-processing';
import {
  EventType,
  Message,
  QualityItem,
  RequestUrlSize,
  URLItem,
  URLsContainer,
} from '@/lib/types';
import { cn, formatBytes } from '@/lib/utils';
import { OctagonAlertIcon } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import type { Runtime } from 'webextension-polyfill';
import {
  addQualityInfoAction,
  deleteQualityInfoAction,
  selectCurrentQuality,
  selectQualitiesList,
  selectQualityInfo,
  setCurrentQualityAction,
} from './store/QualitySelector.slice';
import { useAppDispatch, useAppSelector } from './store/store';

export function QualitySelector() {
  const dispatch = useAppDispatch();
  const movieInfo = useAppSelector(selectMovieInfo)!;

  const quality = useAppSelector(selectCurrentQuality);
  const qualitiesList = useAppSelector(selectQualitiesList);
  const qualitiesInfo = useAppSelector(selectQualityInfo);

  const getTargetQualityInfo = useCallback(
    (qualityItem: QualityItem) => {
      return dispatch((_dispatch, getState) => {
        const currentQualitiesInfo = selectQualityInfo(getState());
        return currentQualitiesInfo?.[qualityItem];
      });
    },
    [dispatch],
  );

  const updateQualityInfo = useCallback(
    (qualityItem: QualityItem, urlItem: URLItem) => {
      dispatch((dispatch, getState) => {
        const currentQualitiesInfo = selectQualityInfo(getState());

        const updates = Object.fromEntries(
          Object.entries(urlItem).filter(([, v]) => v !== undefined),
        );
        const qualityInfo: URLsContainer = {
          [qualityItem]: { ...currentQualitiesInfo?.[qualityItem], ...updates },
        };
        dispatch(addQualityInfoAction({ qualityInfo }));
      });
    },
    [dispatch],
  );

  useEffect(() => {
    const needToUpdate = settings.displayQualitySize || settings.getRealQuality;
    if (!qualitiesList || !needToUpdate) return;

    let ignore = false;
    Object.entries(qualitiesList).forEach(([key, value]) => {
      const qualityItem = key as QualityItem;
      const qualityInfo = getTargetQualityInfo(qualityItem);

      const needFileSize =
        !qualityInfo?.fileSize && settings.displayQualitySize;
      const needResolution =
        !qualityInfo?.videoResolution && settings.getRealQuality;

      if (!needFileSize && !needResolution) return;

      dispatch(deleteQualityInfoAction({ quality: qualityItem }));
      browser.runtime
        .sendMessage<Message<RequestUrlSize>>({
          type: 'getFileSize',
          message: {
            urlsList: value,
            siteUrl: movieInfo.url,
            cacheDisabled: needFileSize !== needResolution,
          },
        })
        .then((response) => {
          const urlItem = response as URLItem;
          if (ignore) return;
          updateQualityInfo(
            qualityItem,
            !urlItem.fileSize && qualityInfo ? qualityInfo : urlItem,
          );
        });
    });

    return () => {
      ignore = true;
    };
  }, [qualitiesList, getTargetQualityInfo, updateQualityInfo]);

  useEffect(() => {
    if (!qualitiesList) return;

    const handleMessage = (
      message: unknown,
      _sender: Runtime.MessageSender,
      _sendResponse: (message: unknown) => void,
    ) => {
      const data = message as Message<URLItem>;

      if (data.type !== 'newFileSize' && data.type !== 'newVideoResolution')
        return false;

      for (const [quality, urls] of Object.entries(qualitiesList)) {
        if (!urls.includes(data.message.url)) continue;
        updateQualityInfo(quality as QualityItem, data.message);
      }
      return true;
    };

    return eventBus.mountHandler(
      EventType.NewMessageReceived,
      browser.runtime.onMessage,
      handleMessage,
    );
  }, [qualitiesList, updateQualityInfo]);

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
          labelComponent({ children, isRenderingInPreview }) {
            const targetQuality = children as QualityItem;
            const qualityInfo = qualitiesInfo?.[targetQuality];
            const videoResolution = qualityInfo?.videoResolution;
            const realResolution = `${videoResolution?.height}p`;
            const isDifferentQuality = targetQuality !== realResolution;
            const realResolutionPill = isDifferentQuality ? (
              <span
                className={cn(
                  'bg-input-active in-data-selected:bg-input relative inline-flex items-center gap-1',
                  'ml-1.75 overflow-clip rounded-md px-1.25 transition-opacity',
                  isRenderingInPreview && !videoResolution && 'opacity-0',
                )}
              >
                {isRenderingInPreview && (
                  <OctagonAlertIcon className='size-4' />
                )}
                <span
                  className={cn(
                    'transition-opacity',
                    videoResolution === undefined && 'opacity-0',
                  )}
                >
                  {videoResolution === undefined
                    ? targetQuality.split(' ')[0]
                    : videoResolution === null
                      ? '???'
                      : realResolution}
                </span>
                {videoResolution === undefined && (
                  <div
                    className='animate-shimmer absolute inset-0 bg-linear-to-r from-transparent via-white/45 to-transparent bg-no-repeat'
                    style={{ backgroundSize: '1rem' }}
                  />
                )}
              </span>
            ) : null;
            return (
              <>
                {targetQuality}
                {settings.getRealQuality && (
                  <>
                    {isRenderingInPreview
                      ? !!videoResolution &&
                        realResolutionPill && (
                          <Tooltip>
                            <TooltipTrigger>
                              {realResolutionPill}
                            </TooltipTrigger>
                            <TooltipContent
                              align='center'
                              side='top'
                              className='flex w-58 items-center justify-between'
                            >
                              <p className='text-sm text-balance'>
                                {browser.i18n.getMessage(
                                  'popup_realResolution',
                                )}
                              </p>
                              <span className='bg-input-active w-fit shrink-0 rounded-sm px-1.25 pb-0.25 text-sm font-medium'>
                                {videoResolution.width} x{' '}
                                {videoResolution.height}
                              </span>
                            </TooltipContent>
                          </Tooltip>
                        )
                      : realResolutionPill}
                  </>
                )}
                {settings.displayQualitySize ? (
                  <span className='ml-auto'>
                    {qualityInfo ? (
                      formatBytes(qualityInfo?.fileSize)
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
