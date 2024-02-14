(async () => {
    if (!self.browser) {
        await importScripts('../lib/browser-polyfill.min.js');
    }
})()

let flagLoader = false;
let flagWork = false;

browser.runtime.onMessage.addListener(
    function (data, sender, sendResponse) {
        data.message !== "Progress" && console.log(data)
        if (data.message === "Trigger") {
            flagLoader = !flagLoader;
            if (flagLoader) {
                preparationForVideoUpload(data.content)
            } else {
                browser.runtime.sendMessage({"message": "Break"});
            }
            sendResponse(true);
        } else if (data.message === "Progress") {
            sendResponse(flagLoader);
        } else if (data.success === false) {
            flagLoader = false;
            if (data.content) {
                browser.runtime.sendMessage({
                    "message": "Error",
                    "content": browser.i18n.getMessage("message_userBreak")
                });
            } else {
                browser.runtime.sendMessage({
                    "message": "Error",
                    "content": browser.i18n.getMessage("message_errorLoad")
                });
            }
        } else {
            console.log(data)
        }
    }
);

async function preparationForVideoUpload(tab_ID) {
    const targetTab = {tabId: tab_ID, allFrames: false};
    browser.scripting.executeScript({
        target: targetTab,
        func: blobIsLoad
    }).then(async (result) => {
        if (result[0].result) {
            await startLoadVideo(tab_ID)
        } else {
            browser.scripting.executeScript({
                target: targetTab,
                func: loadBlob
            }).then(async () => await startLoadVideo(tab_ID))
        }
    })
}

function blobIsLoad() {
    return new Promise((resolve) => {
        const script = document.querySelector('script[src*="lib/Blob.js"]');
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
        script.src = browser.runtime.getURL('lib/Blob.js');
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
    const data = await browser.storage.local.get([key]);
    const video = data[key].dataVideo

    if (data[key].displaySettings.load_all_series) {
        const seasons = data[key].dataPlayer.seasons;
        const episodes = data[key].dataPlayer.episodes;
        const videoConfig = data[key].displaySettings;
        for (let s of seasons.slice(seasons.indexOf(videoConfig.season_start))) {
            let sliceIndex = (s === videoConfig.season_start) ? episodes[s].indexOf(videoConfig.episode_start) : 0;
            for (let e of episodes[s].slice(sliceIndex)) {
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
    await browser.runtime.sendMessage({"message": "Break"});
}

async function initLoadVideo(tab_ID, settingsVideo) {
    const targetTab = {tabId: tab_ID, allFrames: false};

    let urls = await browser.scripting.executeScript({
        target: targetTab,
        func: injectLoader,
        args: [settingsVideo],
    })
    let url_list = urls[0].result.url
    if (!url_list.length) {
        await browser.runtime.sendMessage({
            "message": "Error",
            "content": browser.i18n.getMessage("message_noDataVideo")
        })
        flagLoader = false;
        return false
    }
    let filename = settingsVideo.filename;
    if (settingsVideo.action === "get_movie") {
        filename = filename + ".mp4";
    } else {
        filename = filename + "_S" + settingsVideo.season_id + "E" + settingsVideo.episode_id + ".mp4"
    }
    if (flagLoader) {
        for (const url of url_list) {
            let is_success = await browser.scripting.executeScript({
                target: targetTab,
                func: loadVideo,
                args: [url, filename]
            });
            if (is_success) return true
            console.log("is_success - false")
        }
    } else return false
}

function injectLoader(videoSettings) {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = browser.runtime.getURL('js/injection_scripts/loader.js');
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
                if (!totalSize) throw new Error("Empty object");

                const progressCallback = (event) => {
                    if (event.lengthComputable && flagLoader) {
                        loadedSize = event.loaded;
                        const percentComplete = (loadedSize / totalSize) * 100;
                        browser.runtime.sendMessage({
                            "message": "Progress",
                            "content": percentComplete.toFixed(2)
                        }).then((response) => {
                            flagLoader = response
                            if (!flagLoader && !isUser) {
                                controller.abort();
                                isUser = true;
                                console.log(flagLoader)
                                console.log('Загрузка прервана пользователем.');
                            }
                        });
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
                browser.runtime.sendMessage({"success": false, "content": isUser});
                resolve(false);
            });

    })
}