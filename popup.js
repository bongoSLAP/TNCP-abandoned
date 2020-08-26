var article = null;
var charCount = 0;

function handlePopupRequests(message, sender) {
    if (message.request === "update>charCount") {
        $("#char-count-value").text(message.charCount);
        if (message.charCount <= 200) {
            //console.log("success")
            $("#char-count-container").css("background-color", "rgb(102, 255, 51)")
        }
        else {$("#char-count-container").css("background-color", "rgb(255, 51, 0)")}
    }
}

function setValue() {
    console.log("new value: " + article.headerValue);
    $("#article-headline").text(article.headerValue);
}

$(document).ready(function() {
    $("#detect-article").click(function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            chrome.tabs.sendMessage(tabs[0].id, {request: "update>headline"}, function(response) {
                console.log("Requesting headline")
                article = response;
                setValue();
            });
        });
    });    
});

chrome.runtime.onMessage.addListener(handlePopupRequests);

