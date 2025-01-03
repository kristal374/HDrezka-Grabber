import { Combobox } from '../../../components/Combobox';
import { Checkbox } from '../../../components/Checkbox';
import { useState } from 'react';
import { SubtitleInfo } from '../../../lib/types';

type Subtitle = {
  lang: string;
  code: string;
};

type Props = {
  subtitles: SubtitleInfo | null;
};

export function SubtitleSelector({ subtitles }: Props) {
  if (!subtitles?.subtitle) return null;

  const subtitleArray: Subtitle[] = subtitles.subtitle
    .split(',')
    .map((subtitleInfo) => {
      const [_, lang, _url] = subtitleInfo.match(
        /\[(.*)](https?:\/\/.*\.vtt)/,
      )!;
      return {
        lang: lang,
        code: subtitles!.subtitle_lns[lang],
      };
    });

  const selectedSubtitle =
    subtitleArray.find(
      (subtitle) => subtitle.code === subtitles.subtitle_def,
    ) || null;

  const [subtitleLang, setSubtitleLang] = useState<Subtitle | null>(
    selectedSubtitle,
  );
  const [downloadSubtitle, setDownloadSubtitle] = useState(false);

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
            data={subtitleArray.map((subtitle) => ({
              value: subtitle.code,
              label: subtitle.lang,
            }))}
          />
        </div>
      )}
    </>
  );
}
