function handleHeadlineRequest(message, sender, sendResponse) {
    console.log("Request recieved");
    let headlineList = document.getElementsByTagName("h1");
    sendResponse({headerValue: headlineList[0].innerText})
}

function doneSelecting() {
    let selectedText = window.getSelection().toString();
    if (selectedText.length > 0) {
        chrome.runtime.sendMessage({selection: selectedText});
    }
}

chrome.runtime.onMessage.addListener(handleHeadlineRequest);

window.addEventListener("mouseup", doneSelecting);


