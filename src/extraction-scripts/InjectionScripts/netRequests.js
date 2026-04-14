(async () => {
  const thisScript = document.currentScript;
  const args = JSON.parse(thisScript.dataset.args);

  const response = await sendRequest(args.url, args.body, args.method)
    .then((response) => {
      return response; // "success" flag included in response
    })
    .catch((err) => {
      return { success: false, error: err.err };
    });

  thisScript.dataset.result = JSON.stringify(response);
})();

function sendRequest(url, body, method) {
  return new Promise((resolve, reject) => {
    $.ajax({
      method: method ?? 'POST',
      url: url,
      dataType: 'json',
      data: body,
      success: resolve,
      error: reject,
    });
  });
}
