(() => {
    const elements = document.querySelectorAll('[data-resource]');
    elements.forEach(function (el) {
        el.innerText = chrome.i18n.getMessage(el.getAttribute('data-resource'))
    })
})()