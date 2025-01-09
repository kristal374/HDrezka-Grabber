import { Combobox } from '../../../components/Combobox';
import { Checkbox } from '../../../components/Checkbox';
import { Ref, useImperativeHandle, useState } from 'react';
import { Subtitle, SubtitleInfo, SubtitleRef } from '../../../lib/types';
import { useSubtitle } from '../../hooks/useSubtitle';

type Props = {
  subtitleRef: Ref<SubtitleRef>;
};

export function SubtitleSelector({ subtitleRef }: Props) {
  const [subtitleLang, setSubtitleLang] = useState<Subtitle | null>(null);
  const [downloadSubtitle, setDownloadSubtitle] = useState(false);
  const [subtitles, setSubtitles] = useState<SubtitleInfo | null>(null);
  const subtitlesList: Subtitle[] | null = useSubtitle(
    subtitles,
    setSubtitleLang,
  );

  useImperativeHandle(
    subtitleRef,
    () => ({
      subtitleLang: subtitleLang,
      setSubtitles: (s) =>{
        logger.debug('Set new subtitle:', s);
        setSubtitles(s)
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
            value={subtitleLang!.code}
            onValueChange={(v, l) => setSubtitleLang({ lang: l, code: v })}
            data={subtitlesList.map((subtitle) => ({
              value: subtitle.code,
              label: subtitle.lang,
            }))}
          />
        </div>
      )}
    </>
  );
}
