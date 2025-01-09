import { Combobox } from '../../../components/Combobox';
import { Checkbox } from '../../../components/Checkbox';
import { Ref, useEffect, useImperativeHandle, useState } from 'react';
import { Subtitle, SubtitleInfo, SubtitleRef } from '../../../lib/types';
import {
  decodeSubtitleURL,
  getTargetSubtitle,
} from '../../../lib/link-processing';

type Props = {
  subtitleRef: Ref<SubtitleRef>;
};

export function SubtitleSelector({ subtitleRef }: Props) {
  const [subtitlesInfo, setSubtitlesInfo] = useState<SubtitleInfo | null>(null);
  const [subtitlesList, setSubtitleList] = useState<Subtitle[] | null>(null);
  const [subtitleLang, setSubtitleLang] = useState<Subtitle | null>(null);
  const [downloadSubtitle, setDownloadSubtitle] = useState(false);

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
