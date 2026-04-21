chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'openTab') {
    chrome.tabs.create({ url: msg.url });
  }
});
