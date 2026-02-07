export const MOVIE_PLACEHOLDERS = [
  {
    id: '%movie_id%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_MovieId'),
  },
  {
    id: '%title%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_Title'),
  },
  {
    id: '%orig_title%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_OrigTitle'),
  },
  {
    id: '%translate%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_Translate'),
  },
  {
    id: '%translate_id%',
    display: browser.i18n.getMessage(
      'settings_filenamePlaceholder_TranslateId',
    ),
  },
  {
    id: '%quality%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_Quality'),
  },
  {
    id: '%subtitle_code%',
    display: browser.i18n.getMessage(
      'settings_filenamePlaceholder_SubtitleCode',
    ),
  },
  {
    id: '%subtitle_lang%',
    display: browser.i18n.getMessage(
      'settings_filenamePlaceholder_SubtitleLang',
    ),
  },
  {
    id: '%data%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_Date'),
  },
  {
    id: '%time%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_Time'),
  },
];

export const SERIES_PLACEHOLDERS = [
  {
    id: '%n%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_N'),
  },
  {
    id: '%movie_id%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_MovieId'),
  },
  {
    id: '%title%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_Title'),
  },
  {
    id: '%orig_title%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_OrigTitle'),
  },
  {
    id: '%translate%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_Translate'),
  },
  {
    id: '%translate_id%',
    display: browser.i18n.getMessage(
      'settings_filenamePlaceholder_TranslateId',
    ),
  },
  {
    id: '%episode%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_Episode'),
  },
  {
    id: '%episode_id%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_EpisodeId'),
  },
  {
    id: '%season%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_Season'),
  },
  {
    id: '%season_id%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_SeasonId'),
  },
  {
    id: '%quality%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_Quality'),
  },
  {
    id: '%subtitle_code%',
    display: browser.i18n.getMessage(
      'settings_filenamePlaceholder_SubtitleCode',
    ),
  },
  {
    id: '%subtitle_lang%',
    display: browser.i18n.getMessage(
      'settings_filenamePlaceholder_SubtitleLang',
    ),
  },
  {
    id: '%data%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_Date'),
  },
  {
    id: '%time%',
    display: browser.i18n.getMessage('settings_filenamePlaceholder_Time'),
  },
];

export const SERIES_READY_TEMPLATES = [
  ['%orig_title%', ' S', '%season_id%', 'E', '%episode_id%'],
  ['%title%', ' S', '%season_id%', 'E', '%episode_id%'],

  [
    '%orig_title%',
    ' S',
    '%season_id%',
    'E',
    '%episode_id%',
    ' [',
    '%quality%',
    ']',
  ],
  [
    '%orig_title%',
    ' S',
    '%season_id%',
    'E',
    '%episode_id%',
    ' (',
    '%translate%',
    ')',
  ],
  [
    '%title%',
    ' S',
    '%season_id%',
    'E',
    '%episode_id%',
    ' (',
    '%translate%',
    ')',
  ],

  ['%n%', ') ', '%orig_title%', ' S', '%season_id%', 'E', '%episode_id%'],
  [
    '%n%',
    ') ',
    '%title%',
    ' S',
    '%season_id%',
    'E',
    '%episode_id%',
    ' [',
    '%quality%',
    ']',
  ],

  [
    '%n%',
    ') ',
    '%orig_title%',
    ' (',
    '%translate%',
    ') ',
    '%season%',
    ' ',
    '%episode%',
    ' [',
    '%quality%',
    ']',
  ],

  [
    '%orig_title%',
    ' S',
    '%season_id%',
    'E',
    '%episode_id%',
    ' [',
    '%data%',
    ']',
  ],
];

export const MOVIE_READY_TEMPLATES = [
  ['%orig_title%'],
  ['%title%'],
  ['%orig_title%', ' [', '%quality%', ']'],
  ['%title%', ' [', '%quality%', ']'],
  ['%orig_title%', ' (', '%translate%', ')'],
  ['%title%', ' (', '%translate%', ')'],
  ['%title%', ' [', '%subtitle_lang%', ']'],
  ['%orig_title%', ' [', '%subtitle_code%', ']'],
  ['%orig_title%', ' (', '%translate%', ') [', '%quality%', ']'],
  ['%title%', ' [', '%data%', ']'],
];

export const MOVIE_PREVIEW = [
  {
    label: browser.i18n.getMessage(
      'settings_filenamePreview_filmWithoutSubtitle',
    ),
    value: {
      '%n%': '1',
      '%movie_id%': '768',
      '%title%': 'Как приручить дракона',
      '%orig_title%': 'How to Train Your Dragon',
      '%translate%': 'Дубляж',
      '%translate_id%': '56',
      '%episode%': undefined,
      '%episode_id%': undefined,
      '%season%': undefined,
      '%season_id%': undefined,
      '%quality%': '1080p Ultra',
      '%subtitle_code%': undefined,
      '%subtitle_lang%': undefined,
      '%data%': '',
      '%time%': '',
    },
  },
  {
    label: browser.i18n.getMessage('settings_filenamePreview_filmWithSubtitle'),
    value: {
      '%n%': '1',
      '%movie_id%': '1043',
      '%title%': 'Гарри Поттер и философский камень',
      '%orig_title%': "Harry Potter and the Sorcerer's Stone",
      '%translate%': 'Дубляж',
      '%translate_id%': '56',
      '%episode%': undefined,
      '%episode_id%': undefined,
      '%season%': undefined,
      '%season_id%': undefined,
      '%quality%': '1080p Ultra',
      '%subtitle_code%': 'ru',
      '%subtitle_lang%': 'Русский',
      '%data%': '',
      '%time%': '',
    },
  },
  {
    label: browser.i18n.getMessage(
      'settings_filenamePreview_filmWithoutOrigTitle',
    ),
    value: {
      '%n%': '1',
      '%movie_id%': '12719',
      '%title%': 'Rammstein in Amerika',
      '%orig_title%': '',
      '%translate%': 'Студия Омикрон',
      '%translate_id%': '267',
      '%episode%': undefined,
      '%episode_id%': undefined,
      '%season%': undefined,
      '%season_id%': undefined,
      '%quality%': '1080p Ultra',
      '%subtitle_code%': undefined,
      '%subtitle_lang%': undefined,
      '%data%': '',
      '%time%': '',
    },
  },
  {
    label: browser.i18n.getMessage(
      'settings_filenamePreview_filmWithSpecialChars',
    ),
    value: {
      '%n%': '1',
      '%movie_id%': '5005',
      '%title%': 'З/Л/О: Новый вирус',
      '%orig_title%': 'V/H/S: Viral',
      '%translate%': 'Дубляж',
      '%translate_id%': '56',
      '%episode%': undefined,
      '%episode_id%': undefined,
      '%season%': undefined,
      '%season_id%': undefined,
      '%quality%': '1080p Ultra',
      '%subtitle_code%': undefined,
      '%subtitle_lang%': undefined,
      '%data%': '',
      '%time%': '',
    },
  },
  {
    label: browser.i18n.getMessage(
      'settings_filenamePreview_filmWithVoiceOverDirectCut',
    ),
    value: {
      '%n%': '1',
      '%movie_id%': '969',
      '%title%': 'Властелин колец: Возвращение Короля',
      '%orig_title%': 'The Lord of the Rings: The Return of the King',
      '%translate%': 'Дубляж',
      '%translate_id%': '56',
      '%episode%': undefined,
      '%episode_id%': undefined,
      '%season%': undefined,
      '%season_id%': undefined,
      '%quality%': '1080p Ultra',
      '%subtitle_code%': undefined,
      '%subtitle_lang%': undefined,
      '%data%': '',
      '%time%': '',
    },
  },
];

export const SERIES_PREVIEW = [
  {
    label: browser.i18n.getMessage(
      'settings_filenamePreview_seriesWithoutSubtitle',
    ),
    value: {
      '%n%': '1',
      '%movie_id%': '45',
      '%title%': 'Игра престолов',
      '%orig_title%': 'Game of Thrones',
      '%translate%': 'HDrezka Studio',
      '%translate_id%': '111',
      '%episode%': 'Серия 1',
      '%episode_id%': '1',
      '%season%': 'Сезон 1',
      '%season_id%': '1',
      '%quality%': '1080p Ultra',
      '%subtitle_code%': undefined,
      '%subtitle_lang%': undefined,
      '%data%': '',
      '%time%': '',
    },
  },
  {
    label: browser.i18n.getMessage(
      'settings_filenamePreview_seriesWithSubtitle',
    ),
    value: {
      '%n%': '2',
      '%movie_id%': '646',
      '%title%': 'Во все тяжкие',
      '%orig_title%': 'Breaking Bad',
      '%translate%': 'Оригинал (+субтитры)',
      '%translate_id%': '238',
      '%episode%': 'Серия 2',
      '%episode_id%': '2',
      '%season%': 'Сезон 1',
      '%season_id%': '1',
      '%quality%': '1080p Ultra',
      '%subtitle_code%': 'ru',
      '%subtitle_lang%': 'Русский',
      '%data%': '',
      '%time%': '',
    },
  },
  {
    label: browser.i18n.getMessage(
      'settings_filenamePreview_seriesWithoutOrigTitle',
    ),
    value: {
      '%n%': '3',
      '%movie_id%': '46346',
      '%title%': 'Halo',
      '%orig_title%': '',
      '%translate%': 'Амедиа (Amedia)',
      '%translate_id%': '12',
      '%episode%': 'Серия 3',
      '%episode_id%': '3',
      '%season%': 'Сезон 1',
      '%season_id%': '1',
      '%quality%': '1080p Ultra',
      '%subtitle_code%': undefined,
      '%subtitle_lang%': undefined,
      '%data%': '',
      '%time%': '',
    },
  },
  {
    label: browser.i18n.getMessage(
      'settings_filenamePreview_seriesWithSpecialChars',
    ),
    value: {
      '%n%': '4',
      '%movie_id%': '10827',
      '%title%':
        'Звёздная принцесса и силы зла / Стар против Сил Зла / Звезда против Сил Зла',
      '%orig_title%': 'Star vs. The Forces of Evil',
      '%translate%': 'HDrezka Studio',
      '%translate_id%': '111',
      '%episode%': 'Серия 4',
      '%episode_id%': '4',
      '%season%': 'Сезон 1',
      '%season_id%': '1',
      '%quality%': '1080p Ultra',
      '%subtitle_code%': undefined,
      '%subtitle_lang%': undefined,
      '%data%': '',
      '%time%': '',
    },
  },
  {
    label: browser.i18n.getMessage(
      'settings_filenamePreview_seriesWithUnusualEpisodeTitle',
    ),
    value: {
      '%n%': '5',
      '%movie_id%': '34965',
      '%title%': 'Червяк из будущего',
      '%orig_title%': 'Future-Worm!',
      '%translate%': 'Дубляж',
      '%translate_id%': '56',
      '%episode%': 'Special 5',
      '%episode_id%': '5',
      '%season%': 'Сезон 0',
      '%season_id%': '0',
      '%quality%': '1080p Ultra',
      '%subtitle_code%': undefined,
      '%subtitle_lang%': undefined,
      '%data%': '',
      '%time%': '',
    },
  },
];
