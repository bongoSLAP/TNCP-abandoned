var headlineList = document.getElementsByTagName("h1");
//chrome.runtime.sendMessage(headlineList[0].innerText);
//chrome.runtime.sendMessage("hello world!");

chrome.storage.local.set({headline: headlineList[0].innerText}, function() {
    console.log("headline stored in local storage");
});

