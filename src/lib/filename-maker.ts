import { FileType } from '@/lib/types';

export type Replacements = {
  '%n%': string; // Номер файла
  '%movie_id%': string; // Идентификатор фильма
  '%title%': string; // Локализованное название фильма
  '%orig_title%': string; // Оригинальное название фильма
  '%translate%': string; // Название озвучки
  '%translate_id%': string; // идентификатор озвучки
  '%episode%'?: string; // Полное название серии
  '%episode_id%'?: string; // Идентификатор серии
  '%season%'?: string; // Полное название сезона
  '%season_id%'?: string; // Идентификатор сезона
  '%quality%': string; // Качество видео
  '%subtitle_code%'?: string; // Код языка субтитров
  '%subtitle_lang%'?: string; // Язык субтитров
  '%data%': string; // Дата начала загрузки
  '%time%': string; // Время начала загрузки
};

export function makePathAndFilename(
  replacements: Replacements,
  fileType: FileType,
): readonly [string, string] {
  const template = !replacements['%season%']
    ? settings.filenameFilmTemplate
    : settings.filenameSeriesTemplate;

  let filename = removeBadSymbols(
    template
      .map((item) =>
        /^%.+%$/.test(item)
          ? (replacements[item as keyof Replacements] ?? '')
          : (item ?? ''),
      )
      .join('')
      .replaceAll('%', ' '), // The browser will still replace "%" with a space
  ).trim();

  filename = settings.replaceAllSpaces
    ? filename.replaceAll(' ', '_')
    : filename;
  const extension = fileType == 'video' ? '.mp4' : '.vtt';

  const extensionFolder = settings.createExtensionFolders
    ? 'HDrezkaGrabber/'
    : '';
  const serialFolder =
    replacements['%season%'] && settings.createSeriesFolders
      ? `${replacements['%orig_title%']}/`
      : '';

  return [
    extensionFolder + serialFolder,
    (filename || 'file') + extension,
  ] as const;
}

export function cleanTitle(title: null): null;
export function cleanTitle(title: string): string;
export function cleanTitle(title: string | null): string | null;
export function cleanTitle(title: string | null): string | null {
  if (!title) return null;

  // A movie title may contain multiple alternative movie titles, usually
  // separated by the "\s/\s" pattern, but sometimes one of the spaces
  // is also lost. We cannot use direct separation by "/" because some
  // movie titles contain this character as part of the title.
  const croppedFilename = title.split(/\s\/\s|\s\/\S|\S\/\s/g)[0];

  return removeBadSymbols(
    // We also need to replace all the "/" that are part of the file name.
    croppedFilename.replaceAll('/', ' '),
  ).trim();
}

export function removeBadSymbols(str: string) {
  return (
    str
      // Bad symbols for a name in Windows: \ / : * ? " < > |
      .replaceAll(/[\\\/:*?"<>|]/g, '')
      // Bad symbols found in the names of films on the site: ‪ ‎ ​
      .replaceAll(/[‪‎​]/g, '')
  );
}

export function extractFilename(filename: string) {
  return filename
    .split(/[\\/]/)
    .at(-1)!
    .match(/(.*)\.\w+/)![1];
}
