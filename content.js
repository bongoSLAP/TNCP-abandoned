let selectionList = [];
let finalSelection = "";
let test = [];

//messaging callback to send data between js files
function handleContentRequests(message, sender, sendResponse) {
    if (message.request === "update>headline") {
        let headlineList = document.getElementsByTagName("h1");
        sendResponse({headerValue: headlineList[0].innerText})
    }
    else if (message.request == "reset>selection") {
        selectionList = [];
        finalSelection = "";
    }
}

//special chars can be selected and the search will still work
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


//recursive function for attaining child node data of selected nodes
//function getSiblingNodes(targetNode) {

function getSiblingNodes(targetNode, staticArray) {
    console.log("targetNode.wholeText: ", targetNode.wholeText);
    console.log("staticArray[0].innerText", staticArray[0].innerText);

    newWholeText = targetNode.wholeText + staticArray[0].innerText;
    /*
    let siblingArray = [];
    siblingArray.push(targetNode.wholeText);
    if (targetNode.nextSibling.nodeName == "#text") {
        siblingArray.push(targetNode.nextSibling.wholeText);
    }
    else {
        siblingArray.push(targetNode.nextSibling.innerText);
    }
    
    
    let pushSibling = function(sibling) {
        console.log("siblingArray", siblingArray);
        console.log("sibling.nextSibling", sibling.nextSibling);
        if (sibling.nextSibling != null) {
            if (sibling.nextSibling.nodeName == "#text") {
                siblingArray.push(sibling.nextSibling.wholeText);
            }
            else {
                siblingArray.push(sibling.nextSibling.innerText);
            }

            pushSibling(sibling.nextSibling)
            console.log("not finished");
        }
        else {
            console.log("finished");
            return
        }
    };
    

    pushSibling(targetNode.nextSibling);

    let newWholeText = siblingArray.join("");
    console.log("newWholeText: ", newWholeText);

    //if anchornode is a span then use .parentsibling value
    */

    console.log("newWholeText: ", newWholeText);
    return newWholeText; 

    
}

//autocompletes first selected word.
function completeFirstWord(fullText, selection) {
    let regExp = new RegExp(escapeRegExp(selection));
    let startChar = fullText.search(regExp);

    if (startChar == -1) {console.log("failed")}

    if (fullText.charAt(startChar-1) != " " && startChar != 0) {
        
        /*
        console.log("fullText.charAt: ", fullText.charAt(startChar-1));
        console.log("startChar: ", startChar);
        console.log("fullText: ", fullText);
        console.log("selection: ", selection);
        */

        while (fullText.charAt(startChar-1) != " " && startChar > 0) {
            selection = fullText.charAt(startChar-1).concat(selection);
            startChar--;
        }
    }
    return selection;
}

//autocompletes last selected word
function completeLastWord(fullText, selection) {
    let regExp = new RegExp(escapeRegExp(selection));
    let startChar = fullText.search(regExp);
    let endChar = startChar + selection.length;

    if (fullText.charAt(endChar) != " ") {
        while (fullText.charAt(endChar) != " " && endChar < fullText.length) {
            selection = selection.concat(fullText.charAt(endChar));
            endChar++;
        }
    }
    return selection;
}

/*
//only pushes text-based tags to array to produce final output
function filterSelectedNodes(nodeArray) {
    let validTags = ["H1", "H2", "H3", "H4", "H5", "H6", "P", "LI", "CODE"];

    for (let i=1; i<nodeArray.length-1; i++) {
        for (let j=0; j<validTags.length; j++) {
            if (nodeArray[i].tagName == validTags[j]) {selectionList.push(nodeArray[i].innerText)}
        }
    }
}
*/

function filterSelectedNodes(liveList) {
    let validTags = ["H1", "H2", "H3", "H4", "H5", "H6", "P", "LI", "CODE"];
    let staticArray = [];

    for (let i=0; i<liveList.length; i++) {
        for (let j=0; j<validTags.length; j++) {
            if (liveList[i].tagName == validTags[j]) {staticArray.push(liveList[i])}
        }
    }

    return staticArray;
}

function pushFilteredNodes(staticArray) {
    if (staticArray.length > 2) {
        for (let i=1; i<staticArray.length-1; i++) {
            selectionList.push(staticArray[i].innerText);
        }
    }
}

//selection callback function
function doneSelecting() {
    let selectionObj = window.getSelection();
    let selection = selectionObj.toString();
    //console.log("selectionObj: ", selectionObj);
    
    if (selection.length > 0) {
        if (selectionObj.anchorNode == selectionObj.focusNode) {
            console.log(completeFirstWord(selectionObj.anchorNode.wholeText, completeLastWord(selectionObj.anchorNode.wholeText, selection)));
        }
        else {
            let range = selectionObj.getRangeAt(0);
            let liveNodeList = range.cloneContents().querySelectorAll('*');
            let staticNodeArray = filterSelectedNodes(liveNodeList);
            let newAnchorText = "";
            let newFocusText = "";

            //dont need to use getSiblingNodes function if no sibling elements
            if (selectionObj.anchorNode.nextSibling != null) {newAnchorText = getSiblingNodes(selectionObj.anchorNode, staticNodeArray)}
            else {newAnchorText = selectionObj.anchorNode.wholeText}

            //if (selectionObj.focusNode.nextSibling != null) {newFocusText = getSiblingNodes(selectionObj.focusNode)}
            //else {newFocusText = selectionObj.focusNode.wholeText}

            //if selection went up the page from starting point or down the page from starting point
            if (selectionObj.anchorNode.wholeText.search(staticNodeArray[staticNodeArray.length-1].innerText) == -1) {
                selectionList.push(completeFirstWord(newAnchorText, staticNodeArray[0].innerText));
                pushFilteredNodes(staticNodeArray);
                selectionList.push(completeLastWord(selectionObj.focusNode.wholeText, staticNodeArray[staticNodeArray.length-1].innerText));
            }
            else {
                selectionList.push(completeFirstWord(newFocusText, staticNodeArray[0].innerText));
                pushFilteredNodes(staticNodeArray);
                selectionList.push(completeLastWord(selectionObj.anchorNode.wholeText, staticNodeArray[staticNodeArray.length-1].innerText));
            }

            //concatenating text values of filtered selected elements
            finalSelection = selectionList.join(" ");
            
            
            //console.log("selectionList: ", selectionList);
            console.log("finalSelection: ", finalSelection);
            console.log("staticNodeArray: ", staticNodeArray);
            console.log("selectionObj: ", selectionObj);
            console.log("***************************************************");
            
        }
        selectionList = [];
        finalSelection = "";
    }
}

//event listeners
chrome.runtime.onMessage.addListener(handleContentRequests);
window.addEventListener("mouseup", doneSelecting);


/*
fetch(chrome.extension.getURL('/input-box.html'))
    .then(response => response.text())
    .then(data => {
        document.body.innerHTML += data;
        // other code
        // add event listeners or logic to connect to other parts
    }).catch(err => {
        // handle error
});
*/
