chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostContains: 'developer.chrome.com' },
        }),
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostContains: 'bbc.co.uk' },
        }),
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostContains: 'theguardian.com' },
        }),
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostContains: 'dailymail.co.uk' },
        }),
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostContains: 'buzzfeednews.com' },
        }),
      ],
    actions: [new chrome.declarativeContent.ShowPageAction()]
  }]);
});
});

function processSelectionData(message, sender, sendResponse) {
  newVal = message.selection;
  //validate data
  //store data in database
}

chrome.runtime.onMessage.addListener(processSelectionData);