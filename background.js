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

function storeInDb(submission) {
    //store data in database
}

function validateSubmission(submissionText, sourceLink) {
    //further validate data + url
}

function handleBackgroundRequests(message, sender, sendResponse) {
    if (message.request === "validate>submission") {
        sendResponse({dataReceived: message.data})
    }
}

chrome.runtime.onMessage.addListener(handleBackgroundRequests);