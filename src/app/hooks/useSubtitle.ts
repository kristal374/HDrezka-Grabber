import { useEffect, useState } from 'react';
import { SetState, Subtitle, SubtitleInfo } from '../../lib/types';

export function useSubtitle(
  subtitles: SubtitleInfo | null,
  setSubtitleItem: SetState<Subtitle | null>,
) {
  const [subtitlesList, setSubtitleList] = useState<Subtitle[] | null>(null);

  useEffect(() => {
    if (!subtitles?.subtitle) {
      setSubtitleList(null);
      return;
    }
    const subtitleArray: Subtitle[] = subtitles.subtitle
      .split(',')
      .map((subtitleInfo) => {
        const [_, lang, _url] = subtitleInfo.match(
          /\[(.*)](https?:\/\/.*\.vtt)/,
        )!;
        return {
          lang: lang,
          code: (subtitles!.subtitle_lns as Record<string, string>)[lang],
        };
      });
    setSubtitleList(subtitleArray);

    const selectedSubtitleItem =
      subtitleArray.find(
        (subtitle) => subtitle.code === subtitles.subtitle_def,
      ) || null;
    setSubtitleItem(selectedSubtitleItem);
  }, [subtitles]);

  return subtitlesList;
}
