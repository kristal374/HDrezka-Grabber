import { QualitiesList, QualityItem, Subtitle, SubtitleInfo } from './types';

function clearTrash(data: string) {
  const trashList = [
    '//_//QEBAQEAhIyMhXl5e',
    '//_//Xl5eIUAjIyEhIyM=',
    '//_//JCQhIUAkJEBeIUAjJCRA',
    '//_//IyMjI14hISMjIUBA',
    '//_//JCQjISFAIyFAIyM=',
  ];
  while (trashList.some((subString) => data.includes(subString))) {
    data = data.replace(new RegExp(trashList.join('|'), 'g'), '');
  }
  data = data.replace('#h', '');
  return atob(data);
}

export function getQualityWeight(quality: QualityItem): number {
  const match = quality.match(/^(\d+)([pK])/i);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  // 630 This is the arithmetic mean to obtain an approximate value
  // of height in pixels (p) when multiplying by "K" value.
  let rank = unit === 'k' ? value * 630 : value;
  if (quality.toLowerCase().includes('ultra')) rank++;
  return rank;
}

export function sortQualityItem<T extends Partial<Record<QualityItem, any>>>(
  urlsContainer: T,
): T {
  const qualityWeight: Partial<Record<QualityItem, number>> = {};
  Object.keys(urlsContainer).forEach((key) => {
    const quality = key as QualityItem;
    qualityWeight[quality] = getQualityWeight(quality);
  });

  return Object.entries(qualityWeight)
    .sort((a, b) => b[1] - a[1])
    .reduce((acc, [key, _weight]) => {
      const quality = key as QualityItem;
      acc[quality] = urlsContainer[quality];
      return acc;
    }, {} as T);
}

export function decodeVideoURL(stream: string | false): QualitiesList | null {
  if (!stream) return null;

  const urlsContainer: QualitiesList = {};
  clearTrash(stream)
    .split(',')
    .map((item) => {
      const qualityName = item.match(/\[.*?]/)![0];
      const qualityURLs = item.slice(qualityName.length);
      urlsContainer[qualityName.slice(1, -1) as QualityItem] = qualityURLs
        .split(/\sor\s/)
        .filter((item) => /https?:\/\/.*mp4$/.test(item));
    });

  return sortQualityItem(urlsContainer);
}

export function decodeSubtitleURL(subtitles: SubtitleInfo | null) {
  if (!subtitles?.subtitle) return null;

  const subtitleArray: Subtitle[] = subtitles.subtitle
    .split(',')
    .map((subtitleInfo) => {
      const [_, lang, url] = subtitleInfo.match(/\[(.*)](https?:\/\/.*\.vtt)/)!;
      return {
        lang: lang,
        url: url,
        code: (subtitles!.subtitle_lns as Record<string, string>)[lang],
      };
    });

  return subtitleArray;
}

export function getTargetSubtitle(subtitles: Subtitle[], codeLang: string) {
  return subtitles.find((s) => s.code === codeLang) || null;
}
