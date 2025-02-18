import { useCallback, useEffect, useState } from 'react';
import browser, { Storage } from 'webextension-polyfill';
import { CircularProgressBar } from '../../../components/CircularProgressBar';
import { DownloadIcon, LoadAnimation } from '../../../components/Icons';
import { getFromStorage } from '../../../lib/storage';
import {
  ButtonState,
  Initiator,
  LoadConfig,
  LoadItem,
  LoadStatus,
  Message,
  Progress,
  UrlDetails,
} from '../../../lib/types';
import { useAppDispatch, useAppSelector } from '../../../store';
import { useTrackingCurrentProgress } from '../../hooks/useTrackingCurrentProgress';
import { useTrackingProgressOfFileDownload } from '../../hooks/useTrackingProgressOfFileDownload';
import { selectMovieInfo } from './DownloadScreen.slice';
import { selectRange } from './EpisodeRangeSelector.slice';
import { selectLoadConfig, setLoadConfigIdAction } from './LoadButton.slice';
import { selectCurrentQuality } from './QualitySelector.slice';
import { selectCurrentSubtitle } from './SubtitleSelector.slice';
import { selectCurrentVoiceOver } from './VoiceOverSelector.slice';
import StorageChange = Storage.StorageChange;

type TargetDownloadInfo = {
  id: number | null;
  statuses: Partial<Record<LoadStatus, number[]>>;
  loadConfig: LoadConfig | null;
};

export function LoadButton() {
  const dispatch = useAppDispatch();

  const [isReady, setIsReady] = useState(false);
  const [buttonState, setButtonState] = useState<ButtonState>('DEFAULT');

  const [eventStorage, setEventStorage] = useState<
    Record<string, StorageChange>[]
  >([]);

  const movieInfo = useAppSelector(selectMovieInfo)!;
  const range = useAppSelector(selectRange);
  const voiceOver = useAppSelector(selectCurrentVoiceOver)!;
  const subtitleLang = useAppSelector(selectCurrentSubtitle);
  const quality = useAppSelector(selectCurrentQuality)!;

  const loadConfig = useAppSelector(selectLoadConfig);
  const [loadItemId, setLoadItemId] = useState<number | null>(null);
  const [loadStatuses, setLoadStatuses] = useState<
    Partial<Record<LoadStatus, number[]>>
  >({});

  const progress: Progress = {
    ...useTrackingProgressOfFileDownload(loadStatuses, loadConfig),
    ...useTrackingCurrentProgress(loadItemId),
  };

  useEffect(() => {
    const init = async () => {
      const result = await findTargetDownload(movieInfo.data.id);
      setLoadItemId(result.id);
      dispatch(setLoadConfigIdAction({ loadConfig: result.loadConfig }));
      setLoadStatuses(result.statuses);
      if (result.id !== null) setButtonState('LOADING');
      setIsReady(true);
    };

    init();
  }, []);

  useEffect(() => {
    if (!isReady || eventStorage.length === 0) return;

    let storageCopy = [...eventStorage];
    let loadStatusesCopy = structuredClone(loadStatuses);

    const updateLoadStatuses = (oldValue?: LoadItem, newValue?: LoadItem) => {
      if (oldValue && loadStatusesCopy[oldValue.status]) {
        loadStatusesCopy[oldValue.status] = loadStatusesCopy[
          oldValue.status
        ]!.filter((uid) => uid !== oldValue.uid);
      }

      if (!newValue) return;
      if (!loadStatusesCopy[newValue.status])
        loadStatusesCopy[newValue.status] = [];
      loadStatusesCopy[newValue.status]!.push(newValue.uid);
    };

    const processStorageItem = (item: (typeof eventStorage)[number]) => {
      Object.entries(item).forEach(([key, value]) => {
        if (!value?.newValue) return;

        if (key === 'activeDownloads') {
          const oldValue = value.oldValue as number[] | undefined;
          const newValue = value.newValue as number[] | undefined;
          if (!loadItemId || !loadConfig) return;

          if (
            oldValue?.includes(loadItemId) &&
            !newValue?.includes(loadItemId)
          ) {
            setLoadItemId(null);
            const nextLoadItem = newValue?.find((uid) =>
              loadConfig.loadItems.includes(uid),
            );
            if (!nextLoadItem) return;
            setLoadItemId(nextLoadItem);
          }
        } else if (key.startsWith('d')) {
          const itemId = parseInt(key.split('-').at(-1)!);
          if (!loadConfig?.loadItems.includes(itemId)) return;

          const oldValue = value.oldValue as LoadItem | undefined;
          const newValue = value.newValue as LoadItem | undefined;
          if (oldValue?.status === newValue?.status) return;

          if (!loadItemId && newValue) {
            setLoadItemId(newValue.uid);
          }
          updateLoadStatuses(oldValue, newValue);
        } else if (
          key.startsWith('u') &&
          key.split('-').at(-1) === movieInfo.data.id
        ) {
          dispatch(
            setLoadConfigIdAction({
              loadConfig: Object.values(
                (value.newValue as UrlDetails).loadRegistry,
              ).at(-1)!,
            }),
          );
          loadStatusesCopy = {};
        }
      });
    };

    const countElement = storageCopy.length;
    while (storageCopy.length > 0) {
      processStorageItem(storageCopy.shift()!);
    }
    setLoadStatuses(loadStatusesCopy);
    setEventStorage((prev) => prev.slice(countElement));
  }, [eventStorage, isReady]);

  useEffect(() => {
    // Отслеживает любые изменения в хранилище и сохраняет их до момента
    // когда компонент будет готов их обработать
    const handleStorageChange = (
      changes: Record<string, StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local') return;
      setEventStorage((prev) => [...prev, changes]);
    };
    browser.storage.onChanged.addListener(handleStorageChange);
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const handleClick = useCallback(() => {
    setButtonState((prevState) => {
      switch (prevState) {
        case 'LOADING':
          return 'CANCELLED';
        case 'PROCESSING':
          return 'CANCELLED';
        case 'DEFAULT':
          return 'PROCESSING';
        default:
          throw new Error('Unexpected state');
      }
    });

    browser.runtime
      .sendMessage<Message<Initiator>>({
        type: 'trigger',
        message: {
          query_data: movieInfo.data,
          site_url: movieInfo.url,
          range: range,
          film_name: {
            localized: movieInfo.filename.local,
            original: movieInfo.filename.origin,
          },
          voice_over: voiceOver,
          quality: quality,
          subtitle: subtitleLang?.lang ?? null,
          timestamp: new Date().getTime(),
        },
      })
      .then(() => {
        setButtonState((prevState) =>
          prevState === 'PROCESSING' ? 'LOADING' : 'DEFAULT',
        );
      });
  }, [movieInfo, range, voiceOver, subtitleLang, quality]);

  if (buttonState === 'LOADING' && progress.completed === progress.total) {
    setButtonState('COMPLETED');
  }

  // logger.info('New render LoadButton component.');
  return (
    <button
      className='relative flex size-[120px] cursor-pointer items-center justify-center rounded-full bg-popup-border text-white hover:bg-input'
      onClick={handleClick}
    >
      {buttonState === 'DEFAULT' && <DownloadIcon />}
      {buttonState === 'PROCESSING' && <LoadAnimation size={96} fill='white' />}
      {buttonState === 'LOADING' && <CircularProgressBar progress={progress} />}
      {buttonState === 'COMPLETED' && 'OK!'}
      {buttonState === 'CANCELLED' && 'CANCELLED'}
    </button>
  );
}

async function findTargetDownload(filmId: string) {
  const targetDownloadInfo: TargetDownloadInfo = {
    id: null,
    statuses: {},
    loadConfig: null,
  };

  const activeDownloads = await getActiveDownloadsForThisFilm(filmId);
  targetDownloadInfo.id =
    activeDownloads.length !== 0 ? activeDownloads[0] : null;

  if (targetDownloadInfo.id === null) return targetDownloadInfo;
  const loadConfig = await getTargetLoadConfig(filmId, targetDownloadInfo.id);

  if (loadConfig === null) return targetDownloadInfo;
  targetDownloadInfo.loadConfig = loadConfig;
  const downloadItems = await getDownloadItems(loadConfig.loadItems);
  targetDownloadInfo.statuses = await getLoadStatuses(downloadItems);
  return targetDownloadInfo;
}

async function getActiveDownloadsForThisFilm(filmId: string) {
  const allActiveDownloads =
    (await getFromStorage<number[]>('activeDownloads')) ?? [];
  if (allActiveDownloads.length === 0) return allActiveDownloads;

  const activeDownloadKeys = allActiveDownloads.map((item) => `d-${item}`);
  const activeLoadItem = (await browser.storage.local.get(
    activeDownloadKeys,
  )) as Record<string, LoadItem>;
  return Object.values(activeLoadItem)
    .filter((item) => item.queryData.id === filmId)
    .map((item) => item.uid);
}

async function getTargetLoadConfig(filmId: string, targetDownloadId: number) {
  const urlDetails = await getFromStorage<UrlDetails>(`u-${filmId}`);
  const loadConfigList = Object.values(urlDetails?.loadRegistry ?? {});

  if (loadConfigList.length === 0) return null;
  return loadConfigList
    .filter((item) => item.loadItems.includes(targetDownloadId))
    .at(-1)!;
}

async function getDownloadItems(loadItems: number[]) {
  const downloadsKeys = loadItems.map((uid) => `d-${uid}`);
  return (await browser.storage.local.get(downloadsKeys)) as Record<
    string,
    LoadItem
  >;
}

async function getLoadStatuses(downloadItems: Record<string, LoadItem>) {
  const loadStatuses: Partial<Record<LoadStatus, number[]>> = {};
  Object.values(downloadItems).forEach((item) => {
    if (!loadStatuses[item.status]) loadStatuses[item.status] = [];
    loadStatuses[item.status]!.push(item.uid);
  });
  return loadStatuses;
}

// TODO:
// Сделать повторное открытие попапа быстрее.
// Добавить управление состояниями попапа.