function onGot(item) {
    let headline = item.headline;
    $("#article-headline").text(headline);
}
  
function onError(error) {
    console.log(`Error: ${error}`);
}

$(document).ready(function() {
    $("#detect-article").click(function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            chrome.tabs.sendMessage(tabs[0].id, {request: "Requesting headline"}, function(response) {
                console.log("Requesting headline")
            });
        });
        getHeadline();
    });    
})

function getHeadline() {
    chrome.storage.local.get(["headline"], function(result) {
        console.log('Value currently is ' + result.key);

        let data = result.key
        console.log(data);
        getHeadline.then(onGot(data), onError);
    });
}