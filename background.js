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
function createRecord(resource, data) {
    //if (validateInput(data) == true) {fetch request}
    //else {return error message}

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

    if (resource == 'both') {
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

//fetch submission from db
function readRecord(resource, quantity, subResource) {
    if (quantity == 'one') {
        return new Promise(function(resolve, reject) {
            fetch('https://localhost:44376/api/' + resource + '/' + subResource, {
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
                console.log('data:', data);
                resolve(data);
            }).catch(function (error) {
                console.warn('Something went wrong.', error);
                reject(error);
            });
        }).then(function(message) {
            console.log('message', message);
            return message;
        });
    }
    else if (quantity == 'all') {
        return new Promise(function(resolve, reject) {
            fetch('https://localhost:44376/api/' + resource + '?Url=' + subResource, {
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
                console.log('data:', data);
                resolve(data);
            }).catch(function (error) {
                console.warn('Something went wrong.', error);
                reject(error);
            });
        }).then(function(message) {
            console.log('message', message);
            return message;
        });
    }
}

//update a submission in db
function updateRecord(data, id) {
    //if (validateInput(data) == true) {fetch request}
    //else {return error message}

    console.log(fetch('https://localhost:44376/api/Submissions/' + id, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
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
function deleteRecord(resource, id) {
    console.log(fetch('https://localhost:44376/api/' + resource + '/' + id, {
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

//validation for noSQL XSS, unsafe links etc
function validateInput(data) {
    //validate submission text for noSQL XSS etc
    //validate sourcelink for unsafe links
}

function handleBackgroundRequests(message, sender, sendResponse) {
    if (message.request === 'create>validate') {
        sendResponse({dataReceived: message});
        createRecord(message.resource, message.data)
    }
    else if (message.request === 'read') {
        readRecord(message.resource, message.quantity, message.subResource).then(function(result) {sendResponse({dataFetched: result})});
        return true;
    }
    else if (message.request === 'update>validate') {
        sendResponse({dataReceived: message});
        updateRecord(message.data, message.id)
    }
    else if (message.request === 'delete') {
        sendResponse({dataReceived: message});
        deleteRecord(message.resource, message.id);
    }
}

//Fact check API key: AIzaSyDFpqS-olfCY9kU8mPO4VkxJg-dfR2bS1A
chrome.runtime.onMessage.addListener(handleBackgroundRequests);