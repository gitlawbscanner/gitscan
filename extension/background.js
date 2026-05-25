// Minimal service worker — keeps extension alive during scan polling
chrome.runtime.onInstalled.addListener(() => {
  console.log('gitscan extension installed');
});
