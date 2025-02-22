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

export function sortQualityItem<T extends Partial<Record<QualityItem, any>>>(
  urlsContainer: T,
): T {
  const qualityArr: QualityItem[] = [
    '4K',
    '2K',
    '1080p Ultra',
    '1080p',
    '720p',
    '480p',
    '360p',
  ];
  const sortedUrlsContainer = {} as T;
  qualityArr.forEach((quality) => {
    if (urlsContainer[quality]) {
      sortedUrlsContainer[quality] = urlsContainer[quality];
    }
  });

  (Object.keys(urlsContainer) as QualityItem[]).forEach((quality) => {
    if (!sortedUrlsContainer.hasOwnProperty(quality)) {
      sortedUrlsContainer[quality] = urlsContainer[quality];
    }
  });

  return sortedUrlsContainer;
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
