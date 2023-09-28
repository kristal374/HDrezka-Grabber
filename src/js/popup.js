let dataVideo = {};
let dataPlayer = {};
let displaySettings = {}
let CurrentTab = {
    "id": null,
    "isHdrezka": false
};

(async () => {
    CurrentTab.id = await getCurrentTabId();
    if (!CurrentTab.id) {
        return // выход из функции если id вкладки отсутствует
    }
    const targetTab = {tabId: CurrentTab.id, allFrames: false};
    await chrome.scripting.executeScript({
        target: targetTab,
        func: isTargetSite
    }).then((result) => {
        CurrentTab.isHdrezka = result[0].result // Встраиваемый скрипт для проверки соответствия имени сайта
    })
    console.log("isHDrezka = " + CurrentTab.isHdrezka);
    if (!CurrentTab.isHdrezka) {
        return // выход из функции если сайт не принадлежит ни к одному из зеркал или имён rezka.ag
    }

    await chrome.scripting.executeScript({
        target: targetTab,
        func: getDataVideo
    }).then((result) => {
        setDataVideo(result[0].result);
    })
    if (dataVideo.action === "get_stream") {
        // В случае если мы пытаемся загрузить сериал отображает checkbox позволяющий загрузить весь сериал за раз
        // И получаем данные о количестве серий/эпизодов/озвучек
        showCheckBox();
        await chrome.scripting.executeScript({
            target: targetTab,
            func: getSettingsPlayer
        }).then((result) => {
            setSettingsPlayer(result[0].result);
        })
    }
    await synchData() // Синхронизация данных через локальное хранилище расширения
    if (dataVideo.action === "get_stream") {
        displayValuesSeason()
    } else {
        displayQuality()
    }

    if (Object.keys(displaySettings).length === 0) {
        await saveCurrentSettings()
    } else {
        displayCurrentSettings()
    }
})();

async function getCurrentTabId() {
    const tabs = await chrome.tabs.query({active: true})
    if (tabs && tabs.length > 0) {
        return tabs[0].id;
    } else {
        return null;
    }
}

function isTargetSite() {
    return new Promise((resolve) => {
        const nameSite = document.querySelector('meta[property="og:site_name"]')
        resolve(nameSite && nameSite.content === 'rezka.ag')
    });
}

function getDataVideo() {
    return new Promise((resolve) => {
        console.log("inject getDataVideo success");

        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('src/js/injection_scripts/video_info.js');
        document.documentElement.appendChild(script);

        const intervalId = setInterval(() => {
            if (script.dataset.result !== undefined) {
                clearInterval(intervalId);
                const result = JSON.parse(script.dataset.result);
                document.documentElement.removeChild(script);
                console.log(result);
                resolve(result);
            }
        }, 30);

    });
}

function setDataVideo(frames) {
    dataVideo["film_id"] = frames.film_id;
    dataVideo["translator_id"] = frames.translator_id;
    dataVideo["season_id"] = frames.season_id;
    dataVideo["episode_id"] = frames.episode_id;
    dataVideo["action"] = frames.action;
    dataVideo["filename"] = frames.filename;
    dataVideo["quality"] = frames.quality;

    dataPlayer["qualities"] = frames.qualities;
}

function getSettingsPlayer() {
    return new Promise((resolve) => {
        let dictionary = {
            "translators": {},
            "seasons": [],
            "episodes": {}
        };
        document.querySelectorAll('.b-translator__item').forEach(function (item) {
            dictionary.translators[item.title] = item.getAttribute("data-translator_id")
        });
        if (Object.keys(dictionary.translators).length === 0){
            let elements = document.querySelectorAll('td.l h2');

            let filteredElements = Array.from(elements).filter(element => element.textContent.includes('В переводе'));
            if (filteredElements.length > 0){
                let match  = document.documentElement.outerHTML.match(/sof\.tv\.([^.]*)\((\d+), (\d+), (\d+), (\d+)/);
                let translatorName = filteredElements[0].parentNode.nextElementSibling.textContent.trim();
                dictionary.translators[translatorName] = match[3];
            }
        }
        document.querySelectorAll('.b-simple_season__item').forEach(function (item) {
            dictionary.seasons.push(item.getAttribute("data-tab_id"))
        });
        let episodesList = document.getElementById("simple-episodes-tabs").getElementsByTagName("ul");
        for (let i = 0; i < episodesList.length; i++) {
            let seasonId = episodesList[i].getAttribute("id").split("-")[3];
            let episodes = [];

            let episodeItems = episodesList[i].getElementsByTagName("li");
            for (let j = 0; j < episodeItems.length; j++) {
                let episodeId = episodeItems[j].getAttribute("data-episode_id");
                episodes.push(episodeId);
            }
            dictionary.episodes[seasonId] = episodes;
        }
        console.log(dictionary);
        resolve(dictionary);
    });
}

function setSettingsPlayer(frames) {
    console.log(frames)
    dataPlayer["seasons"] = frames.seasons;
    dataPlayer["episodes"] = frames.episodes;
    dataPlayer["translators"] = frames.translators;
}

async function synchData() {
    const key = CurrentTab.id.toString()
    const result = await chrome.storage.local.get([key]);

    if (result[key] && result[key].dataVideo.film_id === dataVideo.film_id) {
        dataPlayer = result[key].dataPlayer;
        displaySettings = result[key].displaySettings;
    }
    await clearOldData();
    await saveData();
}

async function clearOldData() {
    let lstSavedTab = Object.keys(await chrome.storage.local.get(null))
    const lstAllTab = await chrome.tabs.query({})
    lstAllTab.forEach(function (item) {
        if (lstSavedTab.includes(item.id.toString())) {
            lstSavedTab = lstSavedTab.filter(id_ => id_ !== item.id.toString());
        }
    })
    chrome.storage.local.remove(lstSavedTab);
}

async function saveData() {
    const key = CurrentTab.id.toString()
    return await chrome.storage.local.set({
        [key]: {
            'dataVideo': dataVideo,
            'dataPlayer': dataPlayer,
            'displaySettings': displaySettings
        }
    });
}

function getNewSettings(film_id, translator_id) {
    return new Promise((resolve) => {
        console.log("getNewSettings inject success");

        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('src/js/injection_scripts/update_translate_info.js');
        script.dataset.args = JSON.stringify({
            "film_id": film_id,
            "translator_id": translator_id
        });
        document.documentElement.appendChild(script);

        const intervalId = setInterval(() => {
            if (script.dataset.result !== undefined) {
                clearInterval(intervalId);
                const result = JSON.parse(script.dataset.result);
                document.documentElement.removeChild(script);
                console.log(result);
                resolve(result);
            }
        }, 30);
    });
}