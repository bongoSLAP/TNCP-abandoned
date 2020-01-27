function handleHeadlineRequest(request, sender, sendResponse) {
    console.log("Request recieved");
    let headlineList = document.getElementsByTagName("h1");
    sendResponse({headerValue: headlineList[0].innerText})
}

function doneSelecting() {
    let selectionObj = window.getSelection();
    let selectedText = selectionObj.toString();
    let wholeString = selectionObj.anchorNode.wholeText;
    let regex = new RegExp(selectedText);

    if (selectedText.length > 0) {
        chrome.runtime.sendMessage({selection: selectedText});
        console.log(selectionObj);
        //console.log(wholeString);
        //let endChar = selectedText.charAt(selectedText.length)

        endChar = wholeString.search(regex) + selectedText.length;
        console.log(endChar);

        /*
        for (let i = 0; i < wholeString.length; i++) {
            for (let j = 0; j < selectedText.length; j++) {
                if (selectedText.charAt(j) == wholeString.charAt(i)) {

                }
            }
        }
        
       //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/search 
        
        for (let i = 0; i < wholeString.length; i++) {
            if (wholeString.charAt(i) == "") {}
        }
        */
    }
}

chrome.runtime.onMessage.addListener(handleHeadlineRequest);

window.addEventListener("mouseup", doneSelecting); 