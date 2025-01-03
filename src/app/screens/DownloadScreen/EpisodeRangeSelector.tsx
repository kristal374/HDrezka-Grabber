import { Checkbox } from '../../../components/Checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/Select';
import type { PageType, Seasons, SetState } from '../../../lib/types';
import { SeasonsRef } from '../../../lib/types';
import { cn, sliceSeasons } from '../../../lib/utils';
import { Ref, useEffect, useImperativeHandle, useState } from 'react';
import { useEpisodes } from '../../hooks/useEpisodes';

type Props = {
  pageType: PageType;
  seasonsRef: Ref<SeasonsRef>;
  defaultSeasonStart: string;
  defaultEpisodeStart: string;
  downloadSerial: boolean;
  setDownloadSerial: SetState<boolean>;
  setRange: SetState<Seasons | null>;
};

export function EpisodeRangeSelector({
  pageType,
  seasonsRef,
  defaultSeasonStart,
  defaultEpisodeStart,
  downloadSerial,
  setDownloadSerial,
  setRange,
}: Props) {
  const [seasons, setSeasons] = useEpisodes(pageType);
  const [seasonFrom, setSeasonFrom] = useState(defaultSeasonStart);
  const [episodeFrom, setEpisodeFrom] = useState(defaultEpisodeStart);
  const [seasonTo, setSeasonTo] = useState('-2');
  const [episodeTo, setEpisodeTo] = useState('');
  const downloadToEnd = Number(seasonTo) < 0;

  useEffect(() => {
    if (!seasons) return;
    setRange(
      sliceSeasons(
        seasons,
        downloadSerial ? seasonFrom : defaultSeasonStart,
        downloadSerial ? episodeFrom : defaultEpisodeStart,
        downloadSerial ? seasonTo : defaultSeasonStart,
        downloadSerial ? episodeTo : defaultEpisodeStart,
      ),
    );
  }, [seasons, downloadSerial, seasonFrom, episodeFrom, seasonTo, episodeTo]);

  useImperativeHandle(
    seasonsRef,
    () => ({
      setSeasonsList: (seasonsList: Seasons) => {
        const startSeason = Object.keys(seasonsList)[0];
        const startEpisode = seasonsList[defaultSeasonStart].episodes[0].id;
        setEpisodeFrom(startEpisode);
        setSeasonFrom(startSeason);
        setSeasons(seasonsList);
      },
    }),
    [],
  );

  if (!seasons) return null;

  return (
    <>
      <div className='flex items-center gap-2.5'>
        <Checkbox
          id='downloadSerial'
          checked={downloadSerial}
          onCheckedChange={(value) => setDownloadSerial(value as boolean)}
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
                setSeasonFrom(value);
                setEpisodeFrom(seasons![value].episodes[0].id);
                if (!downloadToEnd && Number(seasonTo) < Number(value)) {
                  setSeasonTo(value);
                  setEpisodeTo(seasons![value].episodes[0].id);
                }
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
                setEpisodeFrom(value);
                if (
                  seasonTo === seasonFrom &&
                  Number(episodeTo) < Number(value)
                ) {
                  setEpisodeTo(value);
                }
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
                setSeasonTo(value);
                setEpisodeTo(
                  Number(value) < 0
                    ? ''
                    : value === seasonFrom
                      ? episodeFrom
                      : seasons![value].episodes[0].id,
                );
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
                  onValueChange={(value) => setEpisodeTo(value)}
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
