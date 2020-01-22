var headline = null;

function handleResponse(message) {
    headline = message.value;
    $("#article-headline").text(headline);
}

$(document).ready(function() {
    $("#detect-article").click(function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            chrome.tabs.sendMessage(tabs[0].id, {request: "Requesting headline"}, function(response) {
                var headline = response.headline;
                $("#article-headline").text(headline);
            });
            console.log("message sent")  
        });
    });    
})


