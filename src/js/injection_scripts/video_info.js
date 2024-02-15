(() => {
    console.log("load video_info success");
    const thisScript = document.currentScript;

    let dictionary = {};
    let match = document.documentElement.outerHTML.match(
        /sof\.tv\.([^.]*)\((\d+), (\d+), (\d+), (\d+)/
    );
    const name_film = $(".b-post__title h1")[0]
        .textContent.replaceAll(" ", "_")
        .replaceAll("_/_", "|");
    let name_origin_film;
    try {
        name_origin_film = $(".b-post__origtitle")[0]
            .textContent.replaceAll(" ", "_")
            .replaceAll("_/_", "|");
    } catch (error) {
        name_origin_film = null;
    }

    if (name_origin_film !== null) {
        dictionary["filename"] = name_origin_film;
    } else {
        dictionary["filename"] = name_film;
    }
    if (match[1] === "initCDNMoviesEvents") {
        dictionary["action"] = "get_movie";
    } else {
        dictionary["action"] = "get_stream";
    }
    let translator_id = $(".b-translator__item.active").data("translator_id");
    if (translator_id !== null) {
        dictionary["translator_id"] = translator_id.toString();
    } else {
        dictionary["translator_id"] = match[3];
    }
    let season_id = $(
        ".b-simple_seasons__list .b-simple_season__item.active"
    ).data("tab_id");
    if (season_id !== null) {
        dictionary["season_id"] = season_id.toString();
    } else {
        dictionary["season_id"] = match[4];
    }
    let episode_id = $(
        ".b-simple_episodes__list .b-simple_episode__item.active"
    ).data("episode_id");
    if (episode_id !== null) {
        dictionary["episode_id"] = episode_id.toString();
    } else {
        dictionary["episode_id"] = match[5];
    }
    dictionary["film_id"] = match[2];
    dictionary["quality"] = CDNPlayer.api("quality").match(
        /\d*(?:(?:K)|(?:p(?:\sUltra)?))/
    )[0];
    dictionary["qualities"] = CDNPlayer.api("qualities").map(
        (item) => item.match(/\d*(?:(?:K)|(?:p(?:\sUltra)?))/)[0]
    );
    thisScript.dataset.result = JSON.stringify(dictionary);
})();
