(() => {
    console.log("load update_translate_info success");
    const thisScript = document.currentScript;
    const args = JSON.parse(thisScript.dataset.args);

    let dictionary = {};
    dictionary["seasons"] = [];
    dictionary["episodes"] = {};

    const t = new Date().getTime();
    $.ajax({
        method: "POST",
        url: "/ajax/get_cdn_series/?t=" + t,
        dataType: "json",
        data: {
            id: args.film_id,
            translator_id: args.translator_id,
            favs: $("#ctrl_favs").val(),
            action: "get_episodes",
        },
        success: function (data) {
            let seasonsList = data.episodes
                .split(`</ul>`)
                .filter((item) => item.trim() !== "");
            for (let i = 0; i < seasonsList.length; i++) {
                let seasonId = seasonsList[i].match(
                    /id="simple-episodes-list-(\d*)"/
                )[1];
                dictionary.seasons.push(seasonId);
                let episodes = [];

                let episodeItems = seasonsList[i]
                    .split(`</li>`)
                    .filter((item) => item.trim() !== "");
                for (let j = 0; j < episodeItems.length; j++) {
                    let episodeId = episodeItems[j].match(
                        /data-episode_id="(\d*)"/
                    )[1];
                    episodes.push(episodeId);
                }
                dictionary.episodes[seasonId] = episodes;
            }
            thisScript.dataset.result = JSON.stringify(dictionary);
        },
        error: function (er) {
            console.error(er);
        },
    });
})();
