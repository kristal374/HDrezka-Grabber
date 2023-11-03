(() => {
    const elements = document.querySelectorAll('[data-resource]');
    elements.forEach(function (el) {
        el.innerText = browser.i18n.getMessage(el.getAttribute('data-resource'))
    })
})()