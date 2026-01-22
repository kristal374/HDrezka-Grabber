import { CheckboxWithLabel } from '@/components/ui/Checkbox';
import { Combobox } from '@/components/ui/Combobox';
import { getSeasons } from '@/extraction-scripts/extractSeasons';
import { PopupInitialDataContext } from '@/html/popup';
import { sliceSeasons } from '@/lib/utils';
import { useContext, useEffect, useMemo } from 'react';
import {
  selectDownloadSerial,
  selectEpisodeFrom,
  selectEpisodeTo,
  selectSeasonFrom,
  selectSeasons,
  selectSeasonTo,
  setDefaultSeasonsAction,
  setDownloadSerialAction,
  setEpisodeFromAction,
  setEpisodeToAction,
  setRangeAction,
  setSeasonFromAction,
  setSeasonToAction,
} from './store/EpisodeRangeSelector.slice';
import { useAppDispatch, useAppSelector } from './store/store';

interface EpisodeRangeSelectorProps {
  defaultSeasonStart: string;
  defaultEpisodeStart: string;
}

export function EpisodeRangeSelector({
  defaultSeasonStart,
  defaultEpisodeStart,
}: EpisodeRangeSelectorProps) {
  const dispatch = useAppDispatch();
  const { tabId, pageType } = useContext(PopupInitialDataContext)!;

  const downloadSerial = useAppSelector(selectDownloadSerial);
  const seasons = useAppSelector(selectSeasons);

  const seasonFrom = useAppSelector(selectSeasonFrom);
  const episodeFrom = useAppSelector(selectEpisodeFrom);
  const seasonTo = useAppSelector(selectSeasonTo);
  const episodeTo = useAppSelector(selectEpisodeTo);

  const downloadToEnd = Number(seasonTo) < 0;

  useEffect(() => {
    if (seasons === null) return;

    const newRange = sliceSeasons(
      seasons,
      downloadSerial ? seasonFrom : defaultSeasonStart,
      downloadSerial ? episodeFrom : defaultEpisodeStart,
      downloadSerial ? seasonTo : defaultSeasonStart,
      downloadSerial ? episodeTo : defaultEpisodeStart,
    );

    dispatch(setRangeAction({ range: newRange }));
  }, [seasons, downloadSerial, seasonFrom, episodeFrom, seasonTo, episodeTo]);

  useEffect(() => {
    // Если у нас нет списка эпизодов/сезонов, получаем их со страницы сайта
    if (seasons !== null) return;
    getSeasons(tabId!, pageType).then((result) => {
      dispatch(
        setDefaultSeasonsAction({
          seasons: result,
          defaultSeason: defaultSeasonStart,
          defaultEpisode: defaultEpisodeStart,
        }),
      );
    });
  }, []);

  const seasonValues = useMemo(
    () =>
      seasons
        ? Object.entries(seasons).map(([id, season]) => ({
            value: id,
            label: season.title,
          }))
        : [],
    [seasons],
  );

  if (!seasons) return null;

  logger.info('New render EpisodeRangeSelector component.');
  return (
    <>
      <CheckboxWithLabel
        id='downloadSerial'
        checked={downloadSerial}
        onCheckedChange={(value) =>
          dispatch(
            setDownloadSerialAction({ downloadSerial: value as boolean }),
          )
        }
      >
        {browser.i18n.getMessage('popup_loadSerial')}
      </CheckboxWithLabel>
      {downloadSerial && seasons && (
        <>
          <div className='flex items-center gap-2.5'>
            <label
              htmlFor='seasonFrom'
              className='ml-auto text-base font-bold select-none'
            >
              {browser.i18n.getMessage('popup_textFrom')}
            </label>

            {/* Components width in pixels: [85] ">" [115] */}
            <Combobox
              id='seasonFrom'
              className='py-0.5'
              width='5.3125rem' // 85px
              data={seasonValues}
              value={seasonFrom}
              onValueChange={(value) => {
                dispatch(setSeasonFromAction({ value }));
              }}
            />

            <label
              htmlFor='episodeFrom'
              className='h-full w-[0.65rem] text-sm select-none'
            >
              {/* Arrow width in pixels: [10.4] */}
              {'>'}
            </label>

            <Combobox
              id='episodeFrom'
              className='py-0.5'
              width='7.1875rem' // 115px
              data={seasons[seasonFrom].episodes.map((episode) => ({
                value: episode.id,
                label: episode.title,
              }))}
              value={episodeFrom}
              onValueChange={(value) => {
                dispatch(setEpisodeFromAction({ value }));
              }}
            />
          </div>

          <div className='flex items-center gap-2.5'>
            <label
              htmlFor='seasonTo'
              className='ml-auto text-base font-bold select-none'
            >
              {browser.i18n.getMessage('popup_textTo')}
            </label>

            {/* Components width in pixels: [85] ">" [115] */}
            <Combobox
              id='seasonTo'
              className='py-0.5'
              width={downloadToEnd ? '14.4rem' : '5.3125rem'}
              data={[
                {
                  value: '-2',
                  label: browser.i18n.getMessage('popup_textEndSeasons'),
                },
                ...(seasonValues.length > 1 &&
                seasonFrom !== seasonValues.at(-1)?.value
                  ? [
                      {
                        value: '-1',
                        label: browser.i18n.getMessage('popup_textEndEpisodes'),
                      },
                    ]
                  : []),
                ...seasonValues.filter(
                  (season) => Number(season.value) >= Number(seasonFrom),
                ),
              ]}
              value={seasonTo}
              onValueChange={(value) => {
                dispatch(setSeasonToAction({ value }));
              }}
            />

            {!downloadToEnd && (
              <>
                <label
                  htmlFor='episodeFrom'
                  className='h-full w-[0.65rem] text-sm select-none'
                >
                  {/* Arrow width in pixels: [10.4] */}
                  {'>'}
                </label>

                <Combobox
                  id='episodeTo'
                  className='py-0.5'
                  width='7.1875rem' // 115px
                  data={seasons[seasonTo].episodes
                    .filter((episode) => {
                      return !(
                        seasonTo === seasonFrom &&
                        Number(episode.id) < Number(episodeFrom)
                      );
                    })
                    .map((episode) => ({
                      value: episode.id,
                      label: episode.title,
                    }))}
                  value={episodeTo}
                  onValueChange={(value) => {
                    dispatch(setEpisodeToAction({ value }));
                  }}
                />
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
