import {
  ActualVideoData,
  DataForUpdate,
  ResponseVideoData,
  SeasonsWithEpisodesList,
  SubtitleInfo,
} from '@/lib/types';
import { updateVideoData } from '@/service-worker/network-layer';

async function extractSeasons(seasons: string) {
  const seasonsStorage: SeasonsWithEpisodesList = {};
  const seasonsList = seasons!
    .split('</li>')
    .filter((item) => item.trim() !== '');
  seasonsList.forEach((line) => {
    const [_, seasonID, seasonTitle] = line.match(/data-tab_id="(\d+)">(.*)$/)!;
    seasonsStorage[seasonID] = { title: seasonTitle, episodes: [] };
  });
  return seasonsStorage;
}

async function extractAllEpisodes(serverResponse: ResponseVideoData) {
  const seasonsStorage: SeasonsWithEpisodesList = await extractSeasons(
    serverResponse.seasons!,
  );

  let episodesBlock = serverResponse
    .episodes!.split(`</ul>`)
    .filter((item) => item.trim() !== '');

  episodesBlock.forEach((block) => {
    const episodesList = block
      .split(`</li>`)
      .filter((item) => item.trim() !== '');
    episodesList.forEach((line) => {
      const [_, seasonID, episodeId, EpisodeTitle] = line.match(
        /data-season_id="(\d+)" data-episode_id="(\d+)">(.*)$/,
      )!;
      seasonsStorage[seasonID].episodes.push({
        id: episodeId,
        title: EpisodeTitle,
      });
    });
  });
  return seasonsStorage;
}

export async function updateVideoInfo(
  data: DataForUpdate,
): Promise<ActualVideoData> {
  logger.debug('Request to update video data:', data);
  const serverResponse = await updateVideoData(data.siteURL, data.movieData);
  return {
    seasons: serverResponse?.seasons
      ? await extractAllEpisodes(serverResponse)
      : null,
    subtitle: {
      subtitle: serverResponse.subtitle,
      subtitle_def: serverResponse.subtitle_def,
      subtitle_lns: serverResponse.subtitle_lns,
    } as SubtitleInfo,
    streams: serverResponse.url,
  };
}
