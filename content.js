//var headlineList = document.getElementsByTagName("h1");
//chrome.storage.local.set({headline: headlineList[0].innerText}, function() {
    //console.log("'" + headlineList[0].innerText + "' stored in local storage");
//});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.request === 'Requesting headline') {
        let headlineList = document.getElementsByTagName("h1");
        sendResponse({
            response: "Message received",
            headline: headlineList[0].innerText
        })
    }
    return true;
});

//console.log("message recieved");