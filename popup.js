function handleResponse(message) {
    let headline = message.value;
}

$(document).ready(function() {
    $("#detect-article").click(function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            let reqHeadline = chrome.tabs.sendMessage(tabs[0].id, {request: "Requesting headline"});
            reqHeadline.then(handleResponse);
            console.log("message sent")  
        });

        $("#article-headline").text("");
    });    
})


