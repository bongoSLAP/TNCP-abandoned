$(document).ready(function() {
    $("#detect-article").click(function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            chrome.tabs.sendMessage(tabs[0].id, {request: "Requesting headline"}, function(response) {
                console.log("Requesting headline")
            });
        });
    });    
})

function getHeadline(changes) {
    let changedValues = Object.keys(changes);
    //console.log(changedValues);

    for (var item of changedValues) {
        console.log("new value: " + changes[item].newValue);
        $("#article-headline").text(changes[item].newValue)
    }

    /*
    chrome.storage.local.get(["headline"], function(result) {
        console.log('Value currently is ' + result.key);
        let data = result.key
        //console.log(data);
        getHeadline.then(onGot(data), onError);
    });
    */
}

chrome.storage.onChanged.addListener(getHeadline);

