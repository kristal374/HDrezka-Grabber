(async () => {
  const thisScript = document.currentScript;

  const initialParameters = await extractInitialParameters();

  if (initialParameters === null) {
    thisScript.dataset.result = JSON.stringify({ success: false });
    return;
  }

  const translator = await extractCurrentTranslator();
  const videoInfo = await extractQuality();

  const movieInfo = initialParameters.movieInfo;

  if (translator?.translator_id) {
    movieInfo.translator_id = translator.translator_id;
  }

  if (
    initialParameters.movieInfo.action === 'get_movie' &&
    translator !== null
  ) {
    movieInfo.is_camrip = translator.is_camrip;
    movieInfo.is_director = translator.is_director;
    movieInfo.is_ads = translator.is_ads;
  } else {
    const currentEpisode = await extractCurrentEpisode();
    movieInfo.season = currentEpisode.season_id;
    movieInfo.episode = currentEpisode.episode_id;
  }

  const resultExtractedData = {
    success: true,
    data: movieInfo,
    quality: videoInfo.quality,
    streams: videoInfo.streams,
    subtitle: await extractSubtitle(),
    filename: await extractFilename(),
    url: await extractURL(),
  };
  console.log(resultExtractedData);
  thisScript.dataset.result = JSON.stringify(resultExtractedData);
})();

async function extractFilename() {
  return {
    local: document.querySelector('.b-post__title h1').textContent,
    origin: document.querySelector('.b-post__origtitle')?.textContent,
  };
}

async function extractSubtitle() {
  const subtitleInfo = {
    subtitle: CDNPlayerInfo?.subtitle,
    subtitle_def: CDNPlayerInfo?.subtitle_def,
    subtitle_lns: CDNPlayerInfo?.subtitle_lns,
  };
  return !subtitleInfo.subtitle ? null : subtitleInfo;
}

async function extractQuality() {
  return {
    quality: CDNPlayer?.api('quality'),
    streams: CDNPlayerInfo?.streams,
  };
}

async function extractCurrentTranslator() {
  const translateElement = document.querySelector(
    '.b-translator__item.active',
  )?.dataset;
  if (!translateElement) return null;
  return {
    translator_id: translateElement.translator_id,
    is_camrip: translateElement.camrip || null,
    is_director: translateElement.director || null,
    is_ads: translateElement.ads || null,
  };
}

async function extractCurrentEpisode() {
  const seasonID = document.querySelector(
    '.b-simple_seasons__list .b-simple_season__item.active',
  );
  const episodeID = document.querySelector(
    '.b-simple_episodes__list .b-simple_episode__item.active',
  );
  return {
    season_id: seasonID?.dataset.tab_id,
    episode_id: episodeID?.dataset.episode_id,
  };
}

async function extractInitialParameters() {
  const initialParameters = {};
  const playerConfig = document.documentElement.outerHTML.match(
    /sof\.tv\.(.*?)\((\d+), (\d+), (\d+), (\d+), (\d+|false|true), '(.*?)', (false|true), ({".*?":.*?})\);/,
  );
  const playerInfo = JSON.parse(playerConfig[9]);
  const favs = document.getElementById('ctrl_favs')?.value || null;

  if (!playerConfig) return null;
  if (playerConfig[1] === 'initCDNMoviesEvents') {
    const [
      _match,
      _initiator,
      movieID,
      translatorID,
      is_camrip,
      is_ads,
      is_director,
      _webHost,
      _is_logged,
      _playerInfo,
    ] = playerConfig;
    initialParameters.movieInfo = {
      id: movieID,
      translator_id: translatorID,
      is_camrip: is_camrip,
      is_ads: is_ads,
      is_director: is_director,
      favs: favs,
      action: 'get_movie',
    };
  } else if (playerConfig[1] === 'initCDNSeriesEvents') {
    const [
      _match,
      _initiator,
      movieID,
      translatorID,
      seasonID,
      episodeID,
      _webHost,
      _is_logged,
      _playerInfo,
    ] = playerConfig;
    initialParameters.movieInfo = {
      id: movieID,
      translator_id: translatorID,
      season: seasonID,
      episode: episodeID,
      favs: favs,
      action: 'get_stream',
    };
  } else return null;

  initialParameters.streamInfo = playerInfo.streams;
  initialParameters.subtitleInfo = {
    subtitle: playerInfo.subtitle,
    subtitle_def: playerInfo.subtitle_def,
    subtitle_lns: playerInfo.subtitle_lns,
  };
  return initialParameters;
}

async function extractURL() {
  return window.location.href.split('#')[0];
}
