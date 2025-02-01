import { Ref, useEffect, useImperativeHandle } from 'react';
import { Checkbox } from '../../../components/Checkbox';
import { Combobox } from '../../../components/Combobox';
import {
  decodeSubtitleURL,
  getTargetSubtitle,
} from '../../../lib/link-processing';
import { Subtitle, SubtitleInfo, SubtitleRef } from '../../../lib/types';
import { useStorage } from '../../hooks/useStorage';

type Props = {
  subtitleRef: Ref<SubtitleRef>;
};

export function SubtitleSelector({ subtitleRef }: Props) {
  const [subtitlesInfo, setSubtitlesInfo] = useStorage<SubtitleInfo | null>(
    'subtitlesInfo',
    null,
  );
  const [subtitlesList, setSubtitleList] = useStorage<Subtitle[] | null>(
    'subtitlesList',
    null,
  );
  const [subtitleLang, setSubtitleLang] = useStorage<Subtitle | null>(
    'subtitleLang',
    null,
  );
  const [downloadSubtitle, setDownloadSubtitle] = useStorage(
    'downloadSubtitle',
    false,
  );

  useEffect(() => {
    if (!subtitlesInfo?.subtitle) {
      setDownloadSubtitle(false);
      setSubtitleList(null);
      setSubtitleLang(null);
      return;
    }

    const subtitleArray = decodeSubtitleURL(subtitlesInfo) as Subtitle[];
    setSubtitleList(subtitleArray);

    const targetSubtitleItem = getTargetSubtitle(
      subtitleArray,
      subtitlesInfo.subtitle_def as string,
    );
    setSubtitleLang(targetSubtitleItem);
  }, [subtitlesInfo]);

  useImperativeHandle(
    subtitleRef,
    () => ({
      subtitleLang: subtitleLang,
      setSubtitles: (s) => {
        logger.debug('Set new subtitle:', s);
        setSubtitlesInfo(s);
      },
    }),
    [subtitleLang],
  );

  if (subtitlesList === null || subtitleLang === null) return null;
  logger.info('New render SubtitleSelector component.');

  return (
    <>
      <div className='flex items-center gap-2.5'>
        <Checkbox
          id='downloadSubtitle'
          checked={downloadSubtitle}
          onCheckedChange={(value) => setDownloadSubtitle(value as boolean)}
        />
        <label htmlFor='downloadSubtitle' className='text-base font-bold'>
          {browser.i18n.getMessage('popup_loadSubtitle')}
        </label>
      </div>

      {downloadSubtitle && (
        <div className='flex items-center gap-2.5'>
          <label htmlFor='downloadSubtitle' className='ml-auto text-sm'>
            {browser.i18n.getMessage('popup_subtitleLang')}
          </label>
          <Combobox
            id='subtitles'
            value={JSON.stringify(subtitleLang)}
            onValueChange={(v, _l) => setSubtitleLang(JSON.parse(v))}
            data={subtitlesList.map((subtitle) => ({
              value: JSON.stringify(subtitle),
              label: subtitle.lang,
            }))}
          />
        </div>
      )}
    </>
  );
}
