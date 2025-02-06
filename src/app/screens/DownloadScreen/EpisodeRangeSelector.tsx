import { useEffect } from 'react';
import { Checkbox } from '../../../components/Checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/Select';
import { getSeasons } from '../../../extraction-scripts/extractSeasons';
import { cn, sliceSeasons } from '../../../lib/utils';
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

type Props = {
  defaultSeasonStart: string;
  defaultEpisodeStart: string;
};

export function EpisodeRangeSelector({
  defaultSeasonStart,
  defaultEpisodeStart,
}: Props) {
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
            <Select
              value={seasonFrom}
              onValueChange={(value) => {
                dispatch(setSeasonFromAction({ value: value }));
              }}
            >
              <SelectTrigger id='seasonFrom' className='w-[82px] py-0.5'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(seasons).map(([id, season]) => {
                  return (
                    <SelectItem value={id} key={id}>
                      {season.title}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <label htmlFor='episodeFrom' className='text-sm'>
              {'>'}
            </label>

            <Select
              value={episodeFrom}
              onValueChange={(value) => {
                dispatch(setEpisodeFromAction({ value: value }));
              }}
            >
              <SelectTrigger id='episodeFrom' className='w-[115px] py-0.5'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {seasons[seasonFrom].episodes.map((episode) => {
                  return (
                    <SelectItem value={episode.id} key={episode.id}>
                      {episode.title}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className='flex items-center gap-2.5'>
            {/* Components width in pixels: [82] ">" [115] */}
            <label htmlFor='seasonTo' className='ml-auto text-base font-bold'>
              {browser.i18n.getMessage('popup_textTo')}
            </label>
            <Select
              value={seasonTo}
              onValueChange={(value) => {
                dispatch(setSeasonToAction({ value: value }));
              }}
            >
              <SelectTrigger
                id='seasonTo'
                className={cn(
                  downloadToEnd ? 'w-[225px]' : 'w-[82px]',
                  'py-0.5',
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={'-2'} key={'-2'}>
                  {browser.i18n.getMessage('popup_textEndSeasons')}
                </SelectItem>
                {Object.keys(seasons).length > 1 &&
                  seasonFrom !== Object.keys(seasons).at(-1) && (
                    <SelectItem value={'-1'} key={'-1'}>
                      {browser.i18n.getMessage('popup_textEndEpisodes')}
                    </SelectItem>
                  )}
                {Object.entries(seasons).map(([id, season]) => {
                  if (Number(id) < Number(seasonFrom)) return null;
                  return (
                    <SelectItem value={id} key={id}>
                      {season.title}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {!downloadToEnd && (
              <>
                <label htmlFor='episodeTo' className='text-sm'>
                  {'>'}
                </label>

                <Select
                  value={episodeTo}
                  onValueChange={(value) =>
                    dispatch(setEpisodeToAction({ value: value }))
                  }
                >
                  <SelectTrigger id='episodeTo' className='w-[115px] py-0.5'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons[seasonTo].episodes.map((episode) => {
                      if (
                        seasonTo === seasonFrom &&
                        Number(episode.id) < Number(episodeFrom)
                      ) {
                        return null;
                      }
                      return (
                        <SelectItem value={episode.id} key={episode.id}>
                          {episode.title}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
