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


function validateRegExp(string) {
    //filtering out line breaks
    string = string.replace(/(\r\n|\n|\r)/gm, "");
    //special chars can be selected and the search will still work
    string = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return string;
}


//recursive function for attaining child node data of selected nodes
//function getParentNode(targetNode) {
/*
function getParentNode(targetNode, context) {
    let newWholeText = "";

    //outer means that the wholeText is cut off by a 'sibling' inline tag, so the recursive function adds text value of each nextSibling node until there are none left, assigning newWholeText to this value
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
        newWholeText = siblingArray.join("");
    
    //inner means that the wholeText is part of an inline tag, so the recursive function moves up the family tree until it reaches the last appropriate parent of the inital node, assigning newWholeText to this value
    
        let pushChild = function(child) {
            console.log("child.parentNode.nodeName: ", child.parentNode.nodeName);
            if (child.parentNode.nodeName == "P" || child.parentNode.nodeName == "LI" || child.parentNode.nodeName == "SPAN" || child.parentNode.nodeName == "A" || child.parentNode.nodeName == "UL") {
                if (child.parentNode.nodeName == "#text") {
                    newWholeText = child.parentNode.wholeText;
                }
                else {
                    newWholeText = child.parentNode.innerText;
    
                pushChild(child.parentNode)
                }
            }
            else {
                return
            }
        };
    
        pushChild(targetNode.parentNode);
        console.log("newWholeText: ", newWholeText);
 
    return newWholeText; 
}
*/



//autocompletes first selected word.
function completeFirstWord(targetNode, selection) {
    let fullText = targetNode.wholeText;
    console.log("fullText:", fullText);

    let searchForContext = function(fullText, query) {
        let regExp = new RegExp(validateRegExp(query));
        let contextSearch = fullText.search(regExp);
    
        if (contextSearch == -1) {
            return "search failed";
        }
        else {return contextSearch}
    }
    
    let offset = 0
    while (searchForContext(fullText, selection) == "search failed") {
        offset +=1;
        console.log("current offset is: ", offset);
        
        while (selection.length > fullText.length - offset) {
            var tempArray = selection.split(''); 
            tempArray.splice(tempArray.length-1);
            selection = tempArray.join('');
        }
    }

    console.log("selection", selection);
    let startChar = searchForContext(fullText, selection);

    if (fullText.charAt(startChar-1) != " " && startChar != 0) {
        while (fullText.charAt(startChar-1) != " " && startChar > 0) {
            selection = fullText.charAt(startChar-1).concat(selection);
            startChar--;
        }
    }
    
    return selection;
}



    

//autocompletes last selected word
function completeLastWord(fullText, selection) {
    let regExp = new RegExp(validateRegExp(selection));
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
    console.log("staticArray: ", staticArray);
    if (staticArray.length > 2) {
        for (let i=1; i<staticArray.length-1; i++) {
            console.log("staticArray[i].innerText: ", staticArray[i].innerText);
            selectionList.push(staticArray[i].innerText);
        }
    }
}

//selection callback function
function doneSelecting() {
    let selectionObj = window.getSelection();
    let selection = selectionObj.toString();
    console.log("selectionObj: ", selectionObj);
    
    if (selection.length > 0) {
        if (selectionObj.anchorNode == selectionObj.focusNode) {
            console.log(completeFirstWord(selectionObj.anchorNode.wholeText, completeLastWord(selectionObj.anchorNode.wholeText, selection)));
        }
        else {
            let range = selectionObj.getRangeAt(0);
            let liveNodeList = range.cloneContents().querySelectorAll('*');
            let staticNodeArray = filterSelectedNodes(liveNodeList);
            //let newAnchorText = getParentNode(selectionObj.anchorNode)
            let newFocusText = "";

            //dont need to use getParentNode function if no sibling elements
            //if (selectionObj.anchorNode.nextSibling != null) {newAnchorText = getParentNode(selectionObj.anchorNode)}
            //else {newAnchorText = selectionObj.anchorNode.wholeText}

            //if (selectionObj.focusNode.nextSibling != null) {newFocusText = getParentNode(selectionObj.focusNode)}
            //else {newFocusText = selectionObj.focusNode.wholeText}

            //if selection went up the page from starting point or down the page from starting point
            if (selectionObj.anchorNode.wholeText.search(staticNodeArray[staticNodeArray.length-1].innerText) == -1) {
                selectionList.push(completeFirstWord(selectionObj.anchorNode, staticNodeArray[0].innerText));
                pushFilteredNodes(staticNodeArray);
                selectionList.push(completeLastWord(selectionObj.focusNode.wholeText, staticNodeArray[staticNodeArray.length-1].innerText));
                console.log("selectionList: ", selectionList);
            }
            else {
                selectionList.push(completeFirstWord(newFocusText, staticNodeArray[0].innerText));
                pushFilteredNodes(staticNodeArray);
                selectionList.push(completeLastWord(selectionObj.anchorNode.wholeText, staticNodeArray[staticNodeArray.length-1].innerText));
            }

            //concatenating text values of filtered selected elements
            finalSelection = selectionList.join(" ");
            
            
            console.log("selectionList: ", selectionList);
            console.log("staticNodeArray: ", staticNodeArray);
            console.log("selectionObj: ", selectionObj);
            console.log("======================OUTCOME======================");
            console.log(finalSelection);
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
