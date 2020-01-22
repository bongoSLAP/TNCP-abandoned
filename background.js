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
        ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});

//chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {});
