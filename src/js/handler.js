const grabBtn = document.getElementById("load_btn");

const messge_element = document.getElementById("user-message");
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
        grabBtn.style.setProperty("background-image", `url(../img/load.gif)`);
        browser.runtime.sendMessage({
            message: "Trigger",
            content: CurrentTab.id,
        });
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
    displaySettings["create_folder"] = downloadSeries.checked;
    await saveData();
});

change_season.addEventListener("change", async (event) => {
    displaySettings["season_start"] = event.target.value;
    await saveData();
    displayEpisodes();
});

change_episode.addEventListener("change", async (event) => {
    displaySettings["episode_start"] = event.target.value;
    await saveData();
});

change_translate.addEventListener("change", async (event) => {
    const select_value =
        event.target.selectedOptions[0].getAttribute("translator_id");
    displaySettings["translator_id"] = select_value;
    await saveData();
    browser.scripting
        .executeScript({
            target: { tabId: CurrentTab.id, allFrames: false },
            func: getNewSettings,
            args: [dataVideo.film_id, select_value],
        })
        .then(async (result) => {
            await updateDisplay(result[0].result);
        });
});

change_quality.addEventListener("change", async (event) => {
    displaySettings["quality"] = event.target.value;
    await saveData();
});

async function saveCurrentSettings() {
    displaySettings["create_folder"] = create_folder.checked;
    displaySettings["load_all_series"] = downloadSeries.checked;

    displaySettings["quality"] = change_quality.value;
    if (change_translate.selectedOptions[0]) {
        displaySettings["translator_id"] =
            change_translate.selectedOptions[0].getAttribute("translator_id");
        displaySettings["season_start"] = change_season.value;
        displaySettings["episode_start"] = change_episode.value;
    }
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
        change_translate.querySelector(
            `[translator_id="${displaySettings.translator_id}"]`
        ).selected = true;
    }
    if (displaySettings.translator_id === dataVideo.translator_id) {
        change_season.value = displaySettings.season_start;
        change_episode.value = displaySettings.episode_start;
    }
}

function showCheckBox() {
    let checkbox = document.getElementsByClassName("serials")[0];
    checkbox.style.display = "block";
}

async function updateDisplay(frames) {
    dataPlayer["seasons"] = frames.seasons;
    dataPlayer["episodes"] = frames.episodes;
    displaySeasons();
    displaySettings["season_start"] = change_season.value;
    displayEpisodes();
    displaySettings["episode_start"] = change_episode.value;
    await saveData();
}

function displayValuesSeason() {
    console.log(dataVideo);
    console.log(dataPlayer);
    displayQuality();
    displaySeasons();
    displayEpisodes();
    displayTranslators();
}

function displayTranslators() {
    let voice_selector = document.getElementById("voice-select");
    while (voice_selector.firstChild) {
        voice_selector.removeChild(voice_selector.firstChild);
    }
    if (Object.keys(dataPlayer.translators).length === 0) {
        let optionElement = document.createElement("option");
        optionElement.text = browser.i18n.getMessage("info_unknownVoice");
        optionElement.setAttribute("translator_id", dataVideo.translator_id);
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
            optionElement.setAttribute("translator_id", value);
            voice_selector.add(optionElement);
            if (value === dataVideo.translator_id) {
                optionElement.selected = true;
            }
        }
    }
}

function displaySeasons() {
    let season_selector = document.getElementById("season-select");

    while (season_selector.firstChild) {
        season_selector.removeChild(season_selector.firstChild);
    }
    dataPlayer.seasons.forEach(function (item) {
        let optionElement = document.createElement("option");
        optionElement.text = item;
        season_selector.add(optionElement);
        if (
            item === dataVideo.season_id &&
            dataVideo.translator_id === displaySettings.translator_id
        ) {
            optionElement.selected = true;
        }
    });
}

function displayEpisodes() {
    let episode_selector = document.getElementById("episode-select");

    while (episode_selector.firstChild) {
        episode_selector.removeChild(episode_selector.firstChild);
    }
    let arr;
    if (dataPlayer.episodes[displaySettings.season_start]) {
        arr = dataPlayer.episodes[displaySettings.season_start];
    } else {
        arr = dataPlayer.episodes[Object.keys(dataPlayer.episodes)[0]];
    }

    arr.forEach(function (item) {
        let optionElement = document.createElement("option");
        optionElement.text = item;
        episode_selector.add(optionElement);
        if (
            item === dataVideo.episode_id &&
            displaySettings.season_start === dataVideo.season_id &&
            displaySettings.translator_id === dataVideo.translator_id
        ) {
            optionElement.selected = true;
        }
    });
}

function displayQuality() {
    let quality_selector = document.getElementById("quality-select");

    while (quality_selector.firstChild) {
        quality_selector.removeChild(quality_selector.firstChild);
    }

    dataPlayer.qualities.forEach(function (item) {
        let optionElement = document.createElement("option");
        optionElement.text = item;
        quality_selector.add(optionElement);
        if (item === dataVideo.quality) {
            optionElement.selected = true;
        }
    });
}

browser.runtime.onMessage.addListener(function (data) {
    if (data.message === "Progress") {
        grabBtn.style.setProperty("background-image", "none");
        grabBtn.textContent = data.content + "%";
    } else if (data.message === "Break") {
        grabBtn.textContent = "";
        grabBtn.style.setProperty(
            "background-image",
            `url(../img/startLoad.svg)`
        );
    } else if (data.message === "Error") {
        grabBtn.style.setProperty(
            "background-image",
            `url(../img/startLoad.svg)`
        );
        messge_element.style.display = "block";
        messge_element.textContent = data.content;
    }
});
