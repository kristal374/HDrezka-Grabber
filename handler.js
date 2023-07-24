const grabBtn = document.getElementById("load_btn");

const messge_element = document.getElementById("user-message")
const create_folder = document.getElementById("create-folder");
const downloadSeries = document.getElementById("load-entire-series");

const fieldsContainer = document.getElementById("fields-container");
const startDownloadText = document.querySelector(".container h2");

const change_season = document.getElementById("season-select");
const change_episode = document.getElementById("episode-select");
const change_translate = document.getElementById("voice-select");
const change_quality = document.getElementById("quality-select");

const select_button = document.getElementById("select-directory");

grabBtn.addEventListener("click", async () => {
    console.log("click");
    if (CurrentTab.isHdrezka) {
        console.log("trigers loading video");
        grabBtn.style.setProperty('background-image', `url(icons/load.gif)`);
        navigator.serviceWorker.controller.postMessage({"message": "start_load", "content": CurrentTab.id});
    }
});

downloadSeries.addEventListener("change", async () => {
    const select_value = downloadSeries.checked;
    displaySettings["load_all_series"] = select_value;
    await saveData();

    if (select_value) {
        fieldsContainer.style.display = "block";
        startDownloadText.style.display = "block";
    } else {
        fieldsContainer.style.display = "none";
        startDownloadText.style.display = "none";
    }
});

create_folder.addEventListener("change", async () => {
    const select_value = downloadSeries.checked;
    displaySettings["create_folder"] = select_value;
    await saveData();
});

change_season.addEventListener("change", async (event) => {
    const select_value = event.target.value;
    displaySettings["season_start"] = select_value;
    await saveData();
    dataVideo.season_id = select_value;
    displayEpisodes();
});

change_episode.addEventListener("change", async (event) => {
    const select_value = event.target.value;
    displaySettings["episode_start"] = select_value;
    await saveData();
});

change_translate.addEventListener("change", async (event) => {
    const select_value = event.target.selectedOptions[0].getAttribute("translator_id");
    displaySettings["translator_id"] = select_value;
    await saveData();
    chrome.scripting.executeScript({
        target: { tabId: CurrentTab.id, allFrames: false },
        func: getNewSettings,
        args: [dataVideo.film_id, select_value]
    }).then( async (result) => {
        updateDisplay(result[0].result);
    })
});

change_quality.addEventListener("change", async (event) => {
    const select_value = event.target.value;
    displaySettings["quality"] = select_value;
    await saveData();
});

async function saveCurrentSettings() {
    displaySettings["create_folder"] = create_folder.checked;
    displaySettings["load_all_series"] = downloadSeries.checked;

    displaySettings["quality"] = change_quality.value;
    displaySettings["translator_id"] = change_translate.selectedOptions[0].getAttribute("translator_id");
    displaySettings["season_start"] = change_season.value;
    displaySettings["episode_start"] = change_episode.value;
    await saveData();
}

function displayCurrentSettings() {
    const changeEvent = new Event("change", { bubbles: true });

    create_folder.checked = displaySettings.create_folder;
    create_folder.dispatchEvent(changeEvent);
    downloadSeries.checked = displaySettings.load_all_series;
    downloadSeries.dispatchEvent(changeEvent);

    change_quality.value = displaySettings.quality;
    if (displaySettings.translator_id) {
        change_translate.querySelector(`[translator_id="${displaySettings.translator_id}"]`).selected = true;
    }
    change_season.value = displaySettings.season_start;
    change_episode.value = displaySettings.episode_start;
}

function showCheckBox() {
    let checkbox = document.getElementsByClassName("serials")[0];
    checkbox.style.display = "block";
}

async function updateDisplay(frames) {
    dataPlayer["seasons"] = frames.seasons;
    dataPlayer["episodes"] = frames.episodes;
    displaySeasons();
    displayEpisodes();
    displaySettings["season_start"] = change_season.value;
    displaySettings["episode_start"] = change_episode.value;
    await saveData();
}

function displayValuesSeason() {
    console.log(dataVideo);
    console.log(dataPlayer)
    displayQuality();
    displaySeasons();
    displayEpisodes();
    displayTranslators();
}

function displayTranslators() {
    let voice_selector = document.getElementById("voice-select");
    voice_selector.innerHTML = "";
    if (Object.keys(dataPlayer.translators).length === 0) {
        let optionElement = document.createElement("option");
        optionElement.text = "Неизвестная озвучка";
        optionElement.setAttribute("translator_id", dataVideo.translator_id)
        optionElement.selected = true;
        voice_selector.add(optionElement);
    } else {
        const entries = Object.entries(dataPlayer.translators);
        for (let [key, value] of entries) {
            let optionElement = document.createElement("option");
            optionElement.text = key;
            if (value === "376") {
                optionElement.text = key + "(ua)";
            }
            optionElement.setAttribute("translator_id", value)
            voice_selector.add(optionElement);
            if (value === dataVideo.translator_id) {
                optionElement.selected = true;
            }
        }
    }
}

function displaySeasons() {
    let season_selector = document.getElementById("season-select");
    season_selector.innerHTML = "";
    dataPlayer.seasons.forEach(function (item) {
        let optionElement = document.createElement("option");
        optionElement.text = item;
        season_selector.add(optionElement);
        if (item === dataVideo.season_id && dataVideo.translator_id === displaySettings.translator_id) {
            optionElement.selected = true;
        }
    });
}

function displayEpisodes() {
    let episode_selector = document.getElementById("episode-select");
    episode_selector.innerHTML = "";
    let arr;
    if (dataPlayer.episodes[dataVideo.season_id]) {
        arr = dataPlayer.episodes[dataVideo.season_id]
    } else {
        arr = dataPlayer.episodes[Object.keys(dataPlayer.episodes)[0]]
    }

    arr.forEach(function (item) {
        let optionElement = document.createElement("option");
        optionElement.text = item;
        episode_selector.add(optionElement);
        if (item === dataVideo.episode_id && dataVideo.translator_id === displaySettings.translator_id) {
            optionElement.selected = true;
        }
    });
}

function displayQuality() {
    let quality_selector = document.getElementById("quality-select");
    quality_selector.innerHTML = "";

    dataPlayer.qualities.forEach(function (item) {
        let optionElement = document.createElement("option");
        optionElement.text = item;
        quality_selector.add(optionElement);
        if (item === dataVideo.quality) {
            optionElement.selected = true;
        }
    });
}

navigator.serviceWorker.addEventListener('message', function (event) {
    if (event.data.message === "Progress") {
        grabBtn.style.setProperty('background-image', "none");
        grabBtn.textContent = event.data.content+ "%";

    } else if (event.data.message === "Breake"){
        grabBtn.textContent = "";
        grabBtn.style.setProperty('background-image', `url("data:image/svg+xml,%3Csvg width='18' height='23' viewBox='0 0 18 23' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5.66025 0H11.6603V10.25H17.3205L8.66025 17L0 10.25H5.66025V0Z' fill='white'/%3E%3Cpath d='M0.660254 23V20H16.6603V23H0.660254Z' fill='white'/%3E%3C/svg%3E%0A")`);
    } else if (event.data.message === "Error"){
        grabBtn.style.setProperty('background-image', `url("data:image/svg+xml,%3Csvg width='18' height='23' viewBox='0 0 18 23' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5.66025 0H11.6603V10.25H17.3205L8.66025 17L0 10.25H5.66025V0Z' fill='white'/%3E%3Cpath d='M0.660254 23V20H16.6603V23H0.660254Z' fill='white'/%3E%3C/svg%3E%0A")`);
        messge_element.style.display = "block";
        messge_element.textContent = event.data.content
    }

});