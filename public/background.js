const EXTENSION_PAGE = chrome.runtime.getURL("index.html");

// Open downloads page on extension icon click
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: EXTENSION_PAGE });
});

// Replace chrome://downloads/ immediately
async function handleNavigation(tabId, url) {
  if (url && (url.startsWith("chrome://downloads") || url.startsWith("edge://downloads"))) {
    const { bypass } = await chrome.storage.local.get("bypass");
    if (bypass) {
      await chrome.storage.local.remove("bypass");
      return;
    }
    chrome.tabs.update(tabId, { url: EXTENSION_PAGE });
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    handleNavigation(tabId, changeInfo.url);
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  handleNavigation(tab.id, tab.pendingUrl || tab.url);
});

// Handle "Old page" button: bypass redirect and navigate to native chrome://downloads
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'OPEN_OLD_DOWNLOADS') {
    const tabId = message.tabId || sender.tab?.id;
    if (tabId) {
      chrome.storage.local.set({ bypass: true }, () => {
        chrome.tabs.update(tabId, { url: 'chrome://downloads' });
      });
    }
  }
});
