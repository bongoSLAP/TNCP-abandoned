var article = null;
var charCount = 0;
//send message of data, store as variable here without using chrome storage, update content in popup.html at updatefields(), find a better solution that updates the char count as it changes as a number next to mouse position.

function handlePopupRequests(message, sender) {
    console.log("success1");
    if (message.request === "requesting char count update") {
        $("#char-count-value").text(message.charCount);
        if (message.charCount <= 200) {
            //console.log("success")
            $("#char-count-container").css("background-color", "rgb(102, 255, 51)")
        }
        else {$("#char-count-container").css("background-color", "rgb(255, 51, 0)")}
    }
}

//may be useful later down the road 

//window.close();


function updateFields() {
    chrome.storage.local.get("charCount", function(obj) {});
}

function setValue() {
    console.log("new value: " + article.headerValue);
    $("#article-headline").text(article.headerValue);
}

$(document).ready(function() {
    $("#detect-article").click(function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            chrome.tabs.sendMessage(tabs[0].id, {request: "requesting headline update"}, function(response) {
                console.log("Requesting headline")
                article = response;
                setValue();
            });
        });
    });    
});

chrome.runtime.onMessage.addListener(handlePopupRequests);

