(() => {
    console.log("load loader success");
    const thisScript = document.currentScript;
    const args = JSON.parse(thisScript.dataset.args);
    console.log(args);
    getVideoURL(args).then((result) => {
        thisScript.dataset.result = JSON.stringify({"url": result});
    });
})();


async function getVideoURL(dictionary) {
    const response = await sendRequest(
        dictionary.film_id,
        dictionary.translator_id,
        dictionary.season_id,
        dictionary.episode_id,
        dictionary.action)
    let url = {};
    if (!response.success) {
        return false
    }
    clearTrash(response.url).split(",").forEach(function (item) {
        let data = item.match(/(\[.*])(\bhttps?:\/\/\S+\.mp4\b)/)
        url[data[1]] = data[2]
    })
    let quality = `[${dictionary.quality}]`;
    if (Object.keys(url).length === 0) {
        return false
    } else if (url[quality]) {
        return url[quality]
    } else {
        let keys = CDNPlayer.api('qualities').map((item) => item.match(/\d*p(\sUltra)?/)[0]);
        let index = keys.indexOf(dictionary.quality)
        while (index > 0 && !url[quality]) {
            index -= 1;
            quality = `[${keys[index]}]`
        }
        return url[quality]
    }
}

function sendRequest(film_id, translator_id, season_id, episode_id, action) {
    return new Promise(resolve => {
        var t = new Date().getTime();

        $.ajax({
            method: "POST",
            url: "/ajax/get_cdn_series/?t=" + t,
            dataType: "json",
            data: {
                "id": film_id,
                "translator_id": translator_id,
                "season": season_id,
                "episode": episode_id,
                "favs": $('#ctrl_favs').val(),
                "action": action
            },
            success: function (data) {
                resolve(data);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(textStatus, errorThrown);
                resolve(false)
            }
        })
    })
}

function clearTrash(data) {
    const trashList = ["//_//QEBAQEAhIyMhXl5e",
        "//_//Xl5eIUAjIyEhIyM=",
        "//_//JCQhIUAkJEBeIUAjJCRA",
        "//_//IyMjI14hISMjIUBA",
        "//_//JCQjISFAIyFAIyM="];
    while (trashList.filter(subString => data.includes(subString)).length !== 0) {
        data = data.replace(new RegExp(trashList.join("|"), "g"), "");
    }
    data = data.replace("#h", "");
    return atob(data);
}
