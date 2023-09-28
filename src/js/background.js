let flagLoader = false;
let flagWork = false;

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    sendProgress(message)
    sendResponse(flagLoader);
});

function sendProgress(message) {
    if (flagLoader) {
        sendUserMessage({"message": "Progress", "content": message.percent});
    } else if (message.success === false) {
        flagLoader = false;
        if (message.content) {
            sendUserMessage({"message": "Error", "content": chrome.i18n.getMessage("message_userBreak")});
        } else {
            sendUserMessage({"message": "Error", "content": chrome.i18n.getMessage("message_errorLoad")});
        }
    } else {
        sendUserMessage({"message": "Break"});
    }
}

function sendUserMessage(message) {
    self.clients.matchAll().then(function (clients) {
        clients.forEach(function (client) {
            client.postMessage(message);
        });
    });
}

self.addEventListener('message', async (event) => {
    if (event.data.message === "start_load") {
        flagLoader = !flagLoader;
        if (flagLoader) {
            await preparationForVideoUpload(event.data.content)
        }
    }
});

async function preparationForVideoUpload(tab_ID) {
    const targetTab = {tabId: tab_ID, allFrames: false};
    chrome.scripting.executeScript({
        target: targetTab,
        func: blobIsLoad
    }).then(async (result) => {
        if (result[0].result) {
            await startLoadVideo(tab_ID)
        } else {
            chrome.scripting.executeScript({
                target: targetTab,
                func: loadBlob
            }).then(async () => await startLoadVideo(tab_ID))
        }
    })
}

function blobIsLoad() {
    return new Promise((resolve) => {
        const script = document.querySelector('script[src*="src/js/injection_scripts/Blob.js"]');
        if (script) {
            resolve(true);
        } else {
            resolve(false)
        }
    });
}

function loadBlob() {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('src/js/injection_scripts/Blob.js');
        document.documentElement.appendChild(script);

        script.onload = function () {
            resolve(true);
        };
    });
}

async function startLoadVideo(tab_ID) {
    console.log("startLoadVideo called");
    if (flagWork) {
        return
    }
    flagWork = true;
    const key = tab_ID.toString();
    const data = await chrome.storage.local.get([key]);
    const video = data[key].dataVideo

    if (data[key].displaySettings.load_all_series) {
        const seasons = data[key].dataPlayer.seasons;
        const episodes = data[key].dataPlayer.episodes;
        const videoConfig = data[key].displaySettings;
        for (let s of seasons.slice(seasons.indexOf(videoConfig.season_start))) {
            for (let e of episodes[s].slice(episodes[s].indexOf(videoConfig.episode_start))) {
                if (!flagLoader) {
                    break
                }
                const dict = {
                    "film_id": video.film_id,
                    "translator_id": videoConfig.translator_id,
                    "season_id": s,
                    "episode_id": e,
                    "action": video.action,
                    "quality": videoConfig.quality,
                    "filename": video.filename
                }
                await initLoadVideo(tab_ID, dict)
            }
            videoConfig.episode_start = episodes[seasons.indexOf(s) + 1];
            if (videoConfig.episode_start) {
                videoConfig.episode_start = videoConfig.episode_start[0];
            }
        }

    } else {
        const dict = {
            "film_id": video.film_id,
            "translator_id": video.translator_id,
            "season_id": video.season_id,
            "episode_id": video.episode_id,
            "action": video.action,
            "quality": data[key].displaySettings.quality,
            "filename": video.filename
        }
        await initLoadVideo(tab_ID, dict)
    }
    flagLoader = false;
    flagWork = false;
    sendProgress("")
}

async function initLoadVideo(tab_ID, settingsVideo) {
    const targetTab = {tabId: tab_ID, allFrames: false};

    let url = await chrome.scripting.executeScript({
        target: targetTab,
        func: injectLoader,
        args: [settingsVideo],
    })
    url = url[0].result.url
    if (!url) {
        sendUserMessage({"message": "Error", "content": chrome.i18n.getMessage("message_noDataVideo")})
        flagLoader = false;
        return false
    }
    let filename = settingsVideo.filename;
    if (settingsVideo.action === "get_movie") {
        filename = filename + ".mp4";
    } else {
        filename = filename + "_S" + settingsVideo.season_id + "E" + settingsVideo.episode_id + ".mp4"
    }
    await chrome.scripting.executeScript({
        target: targetTab,
        func: loadVideo,
        args: [url, filename]
    })
    return true
}

function injectLoader(videoSettings) {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('src/js/injection_scripts/loader.js');
        script.dataset.args = JSON.stringify(videoSettings);
        document.documentElement.appendChild(script);

        const intervalId = setInterval(() => {
            if (script.dataset.result !== undefined) {
                clearInterval(intervalId);
                const result = JSON.parse(script.dataset.result);
                document.documentElement.removeChild(script);
                resolve(result);
            }
        }, 30);
    });
}


function loadVideo(url, filename) {
    return new Promise((resolve) => {
        console.log(filename);
        console.log(url);
        console.log("load_start");
        let flagLoader = true;
        let isUser = false;
        const controller = new AbortController();

        fetch(url, {signal: controller.signal})
            .then(response => {
                const totalSize = response.headers.get('content-length');
                let loadedSize = 0;

                const progressCallback = (event) => {
                    if (event.lengthComputable) {
                        loadedSize = event.loaded;
                        const percentComplete = (loadedSize / totalSize) * 100;
                        chrome.runtime.sendMessage({
                            "loaded": loadedSize,
                            "size": totalSize,
                            "percent": percentComplete.toFixed(2)
                        }, function (response) {
                            flagLoader = response
                        });
                        if (!flagLoader) {
                            controller.abort();
                            isUser = true;
                            console.log('Загрузка прервана пользователем.');
                        }
                    }
                };

                // Создание объекта Blob с обратным вызовом прогресса
                return new Promise((resolve, reject) => {
                    const reader = response.body.getReader();
                    const chunks = [];

                    const pump = () => {
                        reader.read().then(({done, value}) => {
                            if (done) {
                                resolve(new Blob(chunks));
                            } else {
                                chunks.push(value);
                                loadedSize += value.byteLength;
                                progressCallback({loaded: loadedSize, lengthComputable: true});
                                pump();
                            }
                        }).catch(reject);
                    };

                    pump();
                });
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                console.log("success load");
                resolve(true);
            })
            .catch(() => {
                console.log("error load");
                chrome.runtime.sendMessage({"success": false, "content": isUser}, function (response) {
                });
                resolve(false);
            });

    })
}