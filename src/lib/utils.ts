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
  episodeTo: string | '-1',
): Seasons {
  const seasonsKeys = Object.keys(seasons).sort(
    (a, b) => parseInt(a) - parseInt(b),
  ); // Сортируем сезоны по возрастанию

  // Обрабатываем случаи для seasonTo
  if (seasonTo === '-1') {
    seasonTo = seasonFrom;
    episodeTo = '-1'; // Последний эпизод в том же сезоне
  } else if (seasonTo === '-2') {
    seasonTo = seasonsKeys[seasonsKeys.length - 1]; // Последний сезон
    episodeTo = '-1'; // Последний эпизод
  }

  const result: Seasons = {};

  for (let seasonKey of seasonsKeys) {
    if (
      parseInt(seasonKey) < parseInt(seasonFrom) ||
      parseInt(seasonKey) > parseInt(seasonTo)
    ) {
      continue; // Пропускаем сезоны вне диапазона
    }

    const season = seasons[seasonKey];
    const episodes = season.episodes;
    let slicedEpisodes = episodes;

    // Если это первый сезон, обрезаем эпизоды начиная с episodeFrom
    if (seasonKey === seasonFrom) {
      slicedEpisodes = episodes.filter(
        (episode) => parseInt(episode.id) >= parseInt(episodeFrom),
      );
    }

    // Если это последний сезон, обрезаем эпизоды до episodeTo
    if (seasonKey === seasonTo) {
      if (episodeTo === '-1') {
        // Если episodeTo -1, берем последний эпизод
        episodeTo = episodes[episodes.length - 1].id;
      }
      slicedEpisodes = slicedEpisodes.filter(
        (episode) => parseInt(episode.id) <= parseInt(episodeTo),
      );
    }

    result[seasonKey] = {
      title: season.title,
      episodes: slicedEpisodes,
    };
  }

  return result;
}
