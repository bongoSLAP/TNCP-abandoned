var article = null;

function setValue() {
    console.log("new value: " + article.headerValue);
    $("#article-headline").text(article.headerValue)
}

$(document).ready(function() {
    $("#detect-article").click(function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            chrome.tabs.sendMessage(tabs[0].id, {request: "Requesting headline"}, function(response) {
                console.log("Requesting headline")
                article = response;
                setValue();
            });
        });
    });    
});
