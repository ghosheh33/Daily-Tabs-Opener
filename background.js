function processInputAsUrl(text) {
  const urlPattern = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(:\d{1,5})?(\/.*)?$/i;
  if (urlPattern.test(text)) {
      return text.startsWith('http') ? text : 'https://' + text;
  } else {
      return 'https://www.google.com/search?q=' + encodeURIComponent(text);
  }
}

function checkAndOpenTabs() {
  const today = new Date().toDateString();

  chrome.storage.sync.get(['lastOpenedDate', 'userUrls', 'isEnabled'], function(result) {
    if (result.isEnabled !== false && result.lastOpenedDate !== today) {
      const urlsToOpen = result.userUrls || [];
      if (urlsToOpen.length > 0) {
        urlsToOpen.forEach(item => {
          chrome.tabs.create({ 
            url: processInputAsUrl(item), 
            active: false,
            pinned: true
          });
        });
        chrome.storage.sync.set({ lastOpenedDate: today });
      }
    }
  });
}

chrome.runtime.onStartup.addListener(() => {
  checkAndOpenTabs();
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.sync.set({ 
      userUrls: ["https://www.google.com"],
      isEnabled: true 
    });
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});