import { Checkbox } from '../../../components/Checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/Select';
import type { PageType } from '../../../lib/types';
import { cn } from '../../../lib/utils';
import { useEpisodes } from '../../hooks/useEpisodes';
import { useEffect, useState } from 'react';

type Props = {
  pageType: PageType;
  defaultSeasonStart: string;
  defaultEpisodeStart: string;
};

export function EpisodeRangeSelector({
  pageType,
  defaultSeasonStart,
  defaultEpisodeStart,
}: Props) {
  if (pageType !== 'SERIAL') return null;

  const seasons = useEpisodes(pageType);
  const [downloadSerial, setDownloadSerial] = useState(false);
  const [seasonFrom, setSeasonFrom] = useState(defaultSeasonStart);
  const [episodeFrom, setEpisodeFrom] = useState(defaultEpisodeStart);
  const [seasonTo, setSeasonTo] = useState('-2');
  const [episodeTo, setEpisodeTo] = useState('');
  const downloadToEnd = Number(seasonTo) < 0;

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
            {/* 82 > 106 */}
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
            {/* 82 > 106 */}
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