function handleRequest(message, sender, sendResponse) {
    console.log("Request recieved");
    let headlineList = document.getElementsByTagName("h1");
    chrome.storage.local.set({headline: headlineList[0].innerText}, function() {
        console.log("'" + headlineList[0].innerText + "' stored in local storage");
    });
    return true;
}

chrome.runtime.onMessage.addListener(handleRequest);



//console.log("message recieved");
