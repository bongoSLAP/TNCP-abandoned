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

//store submission in db
function createSubmission(data) {
    console.log(fetch('https://localhost:44376/api/Submissions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data.submission)
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

    if (data.contents == 'both') {
        console.log(fetch('https://localhost:44376/api/Annotations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data.annotation)
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

//validation for noSQL XSS, unsafe links etc
function validateSubmission(data) {
    //validate submission text for noSQL XSS etc
    //validate sourcelink for unsafe links

    //if (valid) {
        //if (action = create) {
            createSubmission(data);
        //else if (action = update) {
            //updateSubmission(submission) 
}

//fetch submission from db
function readSubmission(id) {
    console.log(fetch('https://localhost:44376/api/Submissions/' + id, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    }).then(function (response) {
        if (response.ok) {
            return response.json();
        }
        return Promise.reject(response);
    }).then(function (data) {
        console.log('data: ', data);
    }).catch(function (error) {
        console.warn('Something went wrong.', error);
    }));

    //message body back to content.js
}

//update a submission in db
function updateSubmission(data, id) {
    delete data.submission.submissionId;
    console.log('data: ', data);

    console.log(fetch('https://localhost:44376/api/Submissions/' + id, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data.submission)
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

//remove submission from db
function deleteSubmission(id) {
    console.log(fetch('https://localhost:44376/api/Submissions/' + id, {
        method: 'DELETE'
    }).then(function (response) {
        if (response.ok) {
            return response
        }
        return Promise.reject(response);
    }).then(function (data) {
        console.log('data: ', data);
    }).catch(function (error) {
        console.warn('Something went wrong.', error);
    }));
}

function handleBackgroundRequests(message, sender, sendResponse) {
    if (message.request === 'validate>submission') {
        sendResponse({dataReceived: message.data})
        //createSubmission(message.data);
        //readSubmission('SUBxgmwwfibl');
        //updateSubmission(message.data, 'SUBxgmwwfibl');
        deleteSubmission('SUBxgmwfibl');
    }
}

//Fact check API key: AIzaSyDFpqS-olfCY9kU8mPO4VkxJg-dfR2bS1A
chrome.runtime.onMessage.addListener(handleBackgroundRequests);