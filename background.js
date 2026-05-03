const DELAY_MS = 600; 

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function processInputAsUrl(text) {
  const urlPattern = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(:\d{1,5})?(\/.*)?$/i;
  if (urlPattern.test(text)) {
      return text.startsWith('http') ? text : 'https://' + text;
  } else {
      return 'https://www.google.com/search?q=' + encodeURIComponent(text);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.sync.set({ 
      userUrls: ["https://www.google.com"],
      isEnabled: true,
      activeDays: [0, 1, 2, 3, 4, 5, 6] 
    });
  }

  chrome.contextMenus.create({
    id: "add-daily-tab",
    title: "إضافة الموقع للروابط اليومية",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "add-daily-tab") {
    chrome.storage.sync.get(['userUrls'], (res) => {
      let urls = res.userUrls || [];
      if (!urls.includes(info.pageUrl)) {
        urls.push(info.pageUrl);
        chrome.storage.sync.set({ userUrls: urls });
      }
    });
  }
});

async function openLinksSequentially(urls) {
  let tabIds = [];
  
  for (const item of urls) {
    const tab = await chrome.tabs.create({ 
      url: processInputAsUrl(item), 
      active: false,
      pinned: true
    });
    tabIds.push(tab.id);
    await sleep(DELAY_MS);
  }

  if (chrome.tabs.group && tabIds.length > 0) {
    try {
      const groupId = await chrome.tabs.group({ tabIds: tabIds });
      await chrome.tabGroups.update(groupId, { title: "الروتين اليومي", color: "blue" });
    } catch (error) {
      console.warn("إصدار المتصفح لا يدعم مجموعات التبويبات", error);
    }
  }
}

function checkAndOpenTabs() {
  const todayStr = new Date().toDateString();
  const currentDay = new Date().getDay();

  chrome.storage.sync.get(['lastOpenedDate', 'userUrls', 'isEnabled', 'activeDays'], function(result) {
    const activeDays = result.activeDays || [0, 1, 2, 3, 4, 5, 6];
    
    if (result.isEnabled !== false && result.lastOpenedDate !== todayStr && activeDays.includes(currentDay)) {
      const urlsToOpen = result.userUrls || [];
      if (urlsToOpen.length > 0) {
        chrome.storage.sync.set({ lastOpenedDate: todayStr });
        openLinksSequentially(urlsToOpen);
      }
    }
  });
}

chrome.runtime.onStartup.addListener(() => {
  checkAndOpenTabs();
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "forceOpenLinks") {
    chrome.storage.sync.get(['userUrls'], (res) => {
      if (res.userUrls && res.userUrls.length > 0) {
        openLinksSequentially(res.userUrls);
      }
    });
  }
});