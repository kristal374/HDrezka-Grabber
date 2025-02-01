import { clsx, type ClassValue } from 'clsx';
import type { Seasons } from './types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function sliceSeasons(
  seasons: Seasons,
  seasonFrom: string,
  episodeFrom: string,
  seasonTo: string | '-1' | '-2',
  episodeTo: string | '',
): Seasons {
  const sortedSeasonKeys = Object.keys(seasons).sort(
    (a, b) => parseInt(a) - parseInt(b),
  );
  if (parseInt(seasonTo) < 0) {
    seasonTo =
      seasonTo === '-2'
        ? sortedSeasonKeys[sortedSeasonKeys.length - 1]
        : seasonFrom;
    episodeTo = '';
  }

  const result: Seasons = {};

  for (const seasonKey of sortedSeasonKeys) {
    if (
      parseInt(seasonKey) < parseInt(seasonFrom) ||
      parseInt(seasonKey) > parseInt(seasonTo)
    ) {
      continue;
    }

    const { title, episodes } = seasons[seasonKey];
    let slicedEpisodes = episodes.sort(
      (a, b) => parseInt(a.id) - parseInt(b.id),
    );

    if (seasonKey === seasonFrom) {
      slicedEpisodes = slicedEpisodes.filter(
        (episode) => parseInt(episode.id) >= parseInt(episodeFrom),
      );
    }

    if (seasonKey === seasonTo && episodeTo !== '') {
      slicedEpisodes = slicedEpisodes.filter(
        (episode) => parseInt(episode.id) <= parseInt(episodeTo),
      );
    }

    result[seasonKey] = { title, episodes: slicedEpisodes };
  }

  return result;
}

export function hashCode(s: string): number {
  return (
    s.split('').reduce(function (a, b) {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0) >>> 0
  );
}
