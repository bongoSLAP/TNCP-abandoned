let selectionList = [];
let finalSelection = "";
let validTags = ["H1", "H2", "H3", "H4", "H5", "H6", "P", "SPAN", "LI", "A", "STRONG", "B", "CITE", "DFN", "EM", "I", "KBD", "LABEL", "Q", "SMALL", "BIG", "SUB", "SUP", "TIME", "VAR"];

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

function searchForContext(targetNode, selection) {
    let fullText = targetNode.wholeText;
    let newSearch = function(searchIn, query) {
        let regExp = new RegExp(validateRegExp(query));
        let searchOutcome = searchIn.search(regExp);

        if (searchOutcome == -1) {
            return "failed";
        }
        else {return searchOutcome}
    }
    
    if (newSearch(fullText, selection) == "failed") {        
        fullText = getParentNode(targetNode);
    }

    let indexFound = newSearch(fullText, selection);
    return [fullText, indexFound];

}

//recursive function for attaining parentNode data of selected nodes
function getParentNode(targetNode) {
    let newWholeText = null;

    let getNextParent = function(child) {
        let finished = false;

        for (let i=0; i<validTags.length; i++) {
            if (child.parentNode.nodeName == validTags[i]) {
                if (child.parentNode.nodeName == "#text") {
                    newWholeText = child.parentNode.wholeText;
                }
                else {
                    newWholeText = child.parentNode.innerText;
                    
                getNextParent(child.parentNode);
                }

                finished = true;
            }

            if (finished == true) {
                return
            }
            else if (finished == false && i == validTags.length) {
                console.log("ERROR: tag not accepted");
            }
        }
    };

    getNextParent(targetNode);
    
    if (newWholeText == null) {console.log("ERROR: conditions not met at getNextParent")}

    return newWholeText; 
}

/*
function getSiblingNodes(targetNode) {
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
}
*/
//^^^reursive function for getting sibling nodes



//autocompletes first selected word.
function completeFirstWord(targetNode, selection) {
    fullText = searchForContext(targetNode, selection)[0];
    let startChar = searchForContext(targetNode, selection)[1];

    if (fullText.charAt(startChar-1) != " " && startChar != 0) {
        while (fullText.charAt(startChar-1) != " " && startChar > 0) {
            selection = fullText.charAt(startChar-1).concat(selection);
            startChar--;
        }
    }
    
    return selection;
}

//autocompletes last selected word
function completeLastWord(targetNode, selection) {
    fullText = searchForContext(targetNode, selection)[0];
    let startChar = searchForContext(targetNode, selection)[1];
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
    let staticArray = [];
    let blockTextTags = ["H1", "H2", "H3", "H4", "H5", "H6", "P", "LI"];

    for (let i=0; i<liveList.length; i++) {
        for (let j=0; j<blockTextTags.length; j++) {
            if (liveList[i].tagName == blockTextTags[j]) {staticArray.push(liveList[i])}
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

function testRange(range) {
    let finished = false;
    for (let i=0; i<validTags.length; i++) {
        if (range.commonAncestorContainer.nodeName == validTags[i]) {
            finished = true;
        }

        if (finished == true) {
            return true;
        }
        else if (finished == false && i == validTags.length) {
            return false;
        }
    }
}

/*
function begunSelecting() {
    var iframe = document.createElement('iframe');
    iframe.classList.add("char-count-iframe");
    iframe.src = chrome.extension.getURL('/character_count.html');
    document.body.appendChild(iframe);
    console.log("iframe: ", iframe);
    let iframeWindow = iframe.contentWindow;
    console.log("iframeWindow", iframeWindow);
    console.log("iframe.src", iframe.src);
    let checkCharCount = function() {
        let initSelection = window.getSelection();
        let charCount = initSelection.toString().length;
        return charCount;
    }
    setInterval(function(){
        console.log("iframeWindow in setinterval function", iframeWindow);
        //iframeWindow.getElementById("#char-count-value").textContent = checkCharCount();
        //console.log("charCount: ", checkCharCount())
    }, 1000);
}
*/
//iframe method ^^^

function updateCharCount() {
    let checkCharCount = function() {
        let initSelection = window.getSelection();
        let charCount = initSelection.toString().length;
        return charCount;
    }

    $("#char-count-value").text(checkCharCount());
    $("#char-count-container").css({position: "absolute", left: event.pageX + 75, top: event.pageY + 75});
    console.log("char count: ", checkCharCount());
}
//this updates whenever mouse moves, only need to do it while mouse is held, maybe addeventlistener inside begunselecting function?

function begunSelecting() {
    $.get(chrome.extension.getURL('/character_count.html'), function(data) {
        $(data).appendTo('body')
    });

    window.addEventListener("mousemove", updateCharCount);
}


//selection callback function
function doneSelecting() {
    window.removeEventListener("mousemove", updateCharCount);
    window.removeEventListener("mousedown", begunSelecting);
    let selectionObj = window.getSelection();
    let selection = selectionObj.toString();
    console.log("selectionObj: ", selectionObj);
    
    if (!selectionObj.isCollapsed) {
        let range = selectionObj.getRangeAt(0);
        console.log("range: ", range);

        if (selectionObj.anchorNode == selectionObj.focusNode || testRange(range) == true) {
            console.log("outcome: ", completeFirstWord(selectionObj.anchorNode, completeLastWord(selectionObj.anchorNode, selection)));
        }
        else if (selectionObj.anchorNode != selectionObj.focusNode) {
            let liveNodeList = range.cloneContents().querySelectorAll('*');
            let staticNodeArray = filterSelectedNodes(liveNodeList);
            console.log("staticNodeArray: ", staticNodeArray);

            //if selection went up the page from starting point or down the page from starting point
            if (selectionObj.anchorNode.wholeText.search(staticNodeArray[staticNodeArray.length-1].innerText) == -1) {
                selectionList.push(completeFirstWord(selectionObj.anchorNode, staticNodeArray[0].innerText));
                pushFilteredNodes(staticNodeArray);
                selectionList.push(completeLastWord(selectionObj.focusNode, staticNodeArray[staticNodeArray.length-1].innerText));
            }
            else {
                selectionList.push(completeFirstWord(selectionObj.focusNode, staticNodeArray[0].innerText));
                pushFilteredNodes(staticNodeArray);
                selectionList.push(completeLastWord(selectionObj.anchorNode, staticNodeArray[staticNodeArray.length-1].innerText));
            }  
            
            //concatenating text values of filtered selected elements
            finalSelection = selectionList.join(" ");
            
            console.log("selectionList: ", selectionList);
            //console.log("staticNodeArray: ", staticNodeArray);
            //console.log("selectionObj: ", selectionObj);
            console.log("======================OUTCOME======================");
            console.log(finalSelection);
            console.log("***************************************************");
        }            
    }
    selectionList = [];
    finalSelection = "";
    window.addEventListener("mousedown", begunSelecting);
    window.addEventListener("mouseup", doneSelecting);
}


//event listeners
chrome.runtime.onMessage.addListener(handleContentRequests);
window.addEventListener("mousedown", begunSelecting);
window.addEventListener("mouseup", doneSelecting);

