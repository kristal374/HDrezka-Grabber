(() => {
    console.log("load update_translate_info success");
    const thisScript = document.currentScript;
    const args = JSON.parse(thisScript.dataset.args);

    let dictionary = {};
    dictionary["seasons"] = []
    dictionary["episodes"] = {}

    const t = new Date().getTime();
    $.ajax({
        method: "POST",
        url: "/ajax/get_cdn_series/?t=" + t,
        dataType: "json",
        data: {
            "id": args.film_id,
            "translator_id": args.translator_id,
            "favs": $('#ctrl_favs').val(),
            "action": "get_episodes"
        },
        success: function (data) {
            let tempElement = document.createElement('div');
            tempElement.innerHTML = data.episodes;

            let episodesList = tempElement.getElementsByTagName("ul");
            for (let i = 0; i < episodesList.length; i++) {
                let seasonId = episodesList[i].getAttribute("id").split("-")[3];
                dictionary.seasons.push(seasonId);
                let episodes = [];

                let episodeItems = episodesList[i].getElementsByTagName("li");
                for (let j = 0; j < episodeItems.length; j++) {
                    let episodeId = episodeItems[j].getAttribute("data-episode_id");
                    episodes.push(episodeId);
                }
                dictionary.episodes[seasonId] = episodes;
            }
            thisScript.dataset.result = JSON.stringify(dictionary);
        },
        error: function (er) {
            console.error(er);
        }
    })
})();
