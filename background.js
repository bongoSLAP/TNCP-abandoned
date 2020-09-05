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

let test = {
    hello: "world"
}

function handleBackgroundRequests(message, sender, sendResponse) {
    if (message.request === 'validate>submission') {
        sendResponse({dataReceived: message.data})

        console.log(fetch('https://localhost:44376/api/Submissions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message.data)
        }).then(function (response) {
            if (response.ok) {
                return response
            }
            return Promise.reject(response);
        }).then(function (data) {
            console.log(data);
        }).catch(function (error) {
            console.warn('Something went wrong.', error);
        }));
    }
}

chrome.runtime.onMessage.addListener(handleBackgroundRequests);