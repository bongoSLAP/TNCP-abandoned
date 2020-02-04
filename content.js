function handleContentRequests(message, sender, sendResponse) {
    if (message.request === "requesting headline update") {
        let headlineList = document.getElementsByTagName("h1");
        sendResponse({headerValue: headlineList[0].innerText})
    }
}

function doneSelecting() {
    let selectionObj = window.getSelection();
    let selectedText = selectionObj.toString();
    let wholeString = selectionObj.anchorNode.wholeText;
    let regExp = new RegExp(selectedText);

    console.log("regular expression:", regExp);

    if (selectedText.length > 0) {
        let startChar = wholeString.search(regExp);
        let endChar = startChar + selectedText.length;

        if (wholeString.charAt(startChar-1) != " " && startChar != 0) {
            while (wholeString.charAt(startChar-1) != " " && startChar > 0) {
                selectedText = wholeString.charAt(startChar-1).concat(selectedText);
                console.log("new string:", selectedText);
                startChar--;
            }
        }
        else {
            console.log("condition met");
        }
            
        if (wholeString.charAt(endChar) != " ") {
            while (wholeString.charAt(endChar) != " " && endChar < wholeString.length) {
                selectedText = selectedText.concat(wholeString.charAt(endChar));
                console.log("new string:", selectedText);
                endChar++;
            }
        }
        else {
            console.log("condition met");
        }

        chrome.runtime.sendMessage({
            request: "requesting char count update",
            charCount: selectedText.length 
        });

        console.log("result:", selectedText);
        console.log("whole string:", wholeString);
    }
}

fetch(chrome.extension.getURL('/input-box.html'))
    .then(response => response.text())
    .then(data => {
        document.body.innerHTML += data;
        // other code
        // eg update injected elements,
        // add event listeners or logic to connect to other parts of the app
    }).catch(err => {
        // handle error
    });

chrome.runtime.onMessage.addListener(handleContentRequests);
window.addEventListener("mouseup", doneSelecting);


