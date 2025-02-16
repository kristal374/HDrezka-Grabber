import { useEffect, useMemo } from 'react';
import { Checkbox } from '../../../components/Checkbox';
import { Combobox } from '../../../components/Combobox';
import { getSeasons } from '../../../extraction-scripts/extractSeasons';
import { sliceSeasons } from '../../../lib/utils';
import { useAppDispatch, useAppSelector } from '../../../store';
import { useInitData } from '../../providers/InitialDataProvider';
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
} from './EpisodeRangeSelector.slice';

interface EpisodeRangeSelectorProps {
  defaultSeasonStart: string;
  defaultEpisodeStart: string;
}

export function EpisodeRangeSelector({
  defaultSeasonStart,
  defaultEpisodeStart,
}: EpisodeRangeSelectorProps) {
  const dispatch = useAppDispatch();
  const { tabId, pageType } = useInitData();

  const downloadSerial = useAppSelector((state) => selectDownloadSerial(state));
  const seasons = useAppSelector((state) => selectSeasons(state));

  const seasonFrom = useAppSelector((state) => selectSeasonFrom(state));
  const episodeFrom = useAppSelector((state) => selectEpisodeFrom(state));
  const seasonTo = useAppSelector((state) => selectSeasonTo(state));
  const episodeTo = useAppSelector((state) => selectEpisodeTo(state));

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
    if (seasons !== null) return;
    getSeasons(tabId, pageType).then((result) => {
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
      <div className='flex items-center gap-2.5'>
        <Checkbox
          id='downloadSerial'
          checked={downloadSerial}
          onCheckedChange={(value) =>
            dispatch(
              setDownloadSerialAction({ downloadSerial: value as boolean }),
            )
          }
        />
        <label htmlFor='downloadSerial' className='text-base font-bold'>
          {browser.i18n.getMessage('popup_loadSerial')}
        </label>
      </div>
      {downloadSerial && seasons && (
        <>
          <div className='flex items-center gap-2.5'>
            {/* Components width in pixels: [82] ">" [115] */}
            <label htmlFor='seasonFrom' className='ml-auto text-base font-bold'>
              {browser.i18n.getMessage('popup_textFrom')}
            </label>

            <Combobox
              id='seasonFrom'
              className='py-0.5'
              width={82}
              data={seasonValues}
              value={seasonFrom}
              onValueChange={(value) => {
                dispatch(setSeasonFromAction({ value }));
              }}
            />

            <label htmlFor='episodeFrom' className='text-sm'>
              {'>'}
            </label>

            <Combobox
              id='episodeFrom'
              className='py-0.5'
              width={115}
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
            {/* Components width in pixels: [82] ">" [115] */}
            <label htmlFor='seasonTo' className='ml-auto text-base font-bold'>
              {browser.i18n.getMessage('popup_textTo')}
            </label>

            <Combobox
              id='seasonTo'
              className='py-0.5'
              width={downloadToEnd ? undefined : 82}
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
                <label htmlFor='episodeTo' className='text-sm'>
                  {'>'}
                </label>

                <Combobox
                  id='episodeTo'
                  className='py-0.5'
                  width={115}
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
