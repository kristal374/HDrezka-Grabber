import { useEffect, useState } from 'react';
import { Menu } from '../components/Menu';
import type {
  PageType,
  Message,
  QualityItem,
  SerialInfo,
  Initiator,
  FilmsFields,
  SerialFields,
  FilmInfo,
} from '../lib/types';
import { DownloadIcon, PremiumIcon } from '../components/Icons';
import { useMovieInfo } from './hooks/useMovieInfo';
import { useVoiceOver } from './hooks/useVoiceOver';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/Select';
import { useQualities } from './hooks/useQualities';
import { useQualitySize } from './hooks/useQualitySize';
import { Combobox } from '../components/Combobox';
import { useEpisodes } from './hooks/useEpisodes';
import { Checkbox } from '../components/Checkbox';
import { cn, sliceSeasons } from '../lib/utils';

type Props = {
  pageType: PageType;
};

export function DownloadScreen({ pageType }: Props) {
  const [movieInfo, subtitles, siteURL] = useMovieInfo(pageType);
  const voiceOvers = useVoiceOver(pageType);
  const [voiceOverId, setVoiceOverId] = useState('');
  const qualities = useQualities(movieInfo);
  const sizes = useQualitySize(qualities);
  const [quality, setQuality] = useState<QualityItem>('720p');
  const seasons = useEpisodes(pageType);
  const [downloadSerial, setDownloadSerial] = useState(false);
  const [seasonFrom, setSeasonFrom] = useState('');
  const [episodeFrom, setEpisodeFrom] = useState('');
  const [seasonTo, setSeasonTo] = useState('-2');
  const [episodeTo, setEpisodeTo] = useState('-1');
  const downloadToEnd = Number(seasonTo) < 0;
  useEffect(() => {
    const m = movieInfo as SerialInfo;
    if (!m) return;
    setSeasonFrom(m.season_id);
    setEpisodeFrom(m.episode_id);
    setVoiceOverId(m.translator_id);
  }, [movieInfo]);
  const [error, setError] = useState<string | null>('Error message');
  if (!movieInfo) return null;
  const queryData: FilmsFields | SerialFields =
    pageType === 'FILM'
      ? {
          is_camrip: (movieInfo as FilmInfo).is_camrip,
          is_director: (movieInfo as FilmInfo).is_director,
          is_ads: (movieInfo as FilmInfo).is_ads,
          action: 'get_movie',
        }
      : {
          season: '1',
          episode: '1',
          action: 'get_stream',
        };
  return (
    <div className='flex size-full flex-col gap-5'>
      <div className='relative flex items-center justify-center'>
        <button
          className='flex size-[120px] cursor-pointer items-center justify-center rounded-full bg-popup-border text-white hover:bg-input'
          onClick={() => {
            browser.runtime.sendMessage<Message<Initiator>>({
              type: 'trigger',
              message: {
                query_data: {
                  id: movieInfo.film_id,
                  translator_id: voiceOverId,
                  favs: movieInfo.favs,
                  ...queryData,
                },
                site_url: siteURL!,
                range: seasons
                  ? downloadSerial || !('season_id' in movieInfo)
                    ? sliceSeasons(
                      seasons,
                      seasonFrom,
                      episodeFrom,
                      seasonTo,
                      episodeTo,
                    )
                    : sliceSeasons(
                      seasons,
                      movieInfo.season_id,
                      movieInfo.episode_id,
                      movieInfo.season_id,
                      movieInfo.episode_id,
                    )
                  : null,
                local_film_name: movieInfo.local_film_name,
                original_film_name: movieInfo.original_film_name,
                voice_over: voiceOvers?.find((v) => v.id === voiceOverId)
                  ?.title!,
                quality: quality,
                subtitle: null,
                timestamp: new Date(),
              },
            });
          }}
        >
          <DownloadIcon />
        </button>
        <Menu />
      </div>
      <div className='flex w-full flex-col gap-3'>
        {error && (
          <div className='rounded bg-error px-1.5 py-1 text-white'>
            <p className='text-sm'>{error}</p>
          </div>
        )}
        {pageType === 'SERIAL' && (
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
                  <label
                    htmlFor='seasonFrom'
                    className='ml-auto text-base font-bold'
                  >
                    {browser.i18n.getMessage('popup_textFrom')}
                  </label>
                  <Select
                    value={seasonFrom}
                    onValueChange={(value) => {
                      setSeasonFrom(value);
                      setEpisodeFrom(seasons[value].episodes[0].id);
                      if (!downloadToEnd && Number(seasonTo) < Number(value)) {
                        setSeasonTo(value);
                        setEpisodeTo(seasons[value].episodes[0].id);
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
                    <SelectTrigger
                      id='episodeFrom'
                      className='w-[115px] py-0.5'
                    >
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
                  <label
                    htmlFor='seasonTo'
                    className='ml-auto text-base font-bold'
                  >
                    {browser.i18n.getMessage('popup_textTo')}
                  </label>
                  <Select
                    value={seasonTo}
                    onValueChange={(value) => {
                      setSeasonTo(value);
                      setEpisodeTo(
                        Number(value) < 0
                          ? '-1'
                          : value === seasonFrom
                            ? episodeFrom
                            : seasons[value].episodes[0].id,
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
                      {Object.keys(seasons).length > 1 &&
                        seasonFrom !== Object.keys(seasons).at(-1) && (
                          <SelectItem value={'-1'} key={'-1'}>
                            {browser.i18n.getMessage('popup_textEndEpisodes')}
                          </SelectItem>
                        )}
                      <SelectItem value={'-2'} key={'-2'}>
                        {browser.i18n.getMessage('popup_textEndSeasons')}
                      </SelectItem>
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
                        <SelectTrigger
                          id='episodeTo'
                          className='w-[115px] py-0.5'
                        >
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
        )}
        {subtitles?.subtitle && (
          <div>
            <p className='text-lg'>Subtitles</p>
          </div>
        )}
        {pageType === 'FILM' && !subtitles ? null : (
          <hr className='w-full border-b border-popup-border' />
        )}
        {voiceOvers && (
          <div className='flex items-center gap-2.5'>
            <label htmlFor='voiceOver' className='ml-auto text-sm'>
              {browser.i18n.getMessage('popup_translate')}
            </label>
            <Select
              value={voiceOverId}
              onValueChange={(v) => setVoiceOverId(v)}
            >
              <SelectTrigger id='voiceOver' className='w-[225px] py-1.5'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {voiceOvers.map((voiceOverInfo) => {
                  return (
                    <SelectItem value={voiceOverInfo.id} key={voiceOverInfo.id}>
                      {voiceOverInfo.title}
                      {voiceOverInfo.flag_country && (
                        <span>
                          ({voiceOverInfo.flag_country.toUpperCase()})
                        </span>
                      )}
                      {voiceOverInfo.prem_content && <PremiumIcon />}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}
        {qualities && (
          <div className='flex items-center gap-2.5'>
            <label htmlFor='qualities' className='ml-auto text-sm'>
              {browser.i18n.getMessage('popup_quality')}
            </label>
            <Combobox
              id='qualities'
              value={quality}
              onValueChange={(v) => setQuality(v as QualityItem)}
              data={Object.keys(qualities).map((quality) => {
                const q = quality as QualityItem;
                return {
                  value: q,
                  label: (
                    <>
                      {q}
                      {sizes && (
                        <span className='ml-auto'>{sizes[q]?.size}</span>
                      )}
                    </>
                  ),
                };
              })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
