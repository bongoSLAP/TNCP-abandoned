let selectionList = [];
let finalSelection = "";
let validTags = ["H1", "H2", "H3", "H4", "H5", "H6", "P", "SPAN", "LI", "A", "STRONG", "B", "CITE", "DFN", "EM", "I", "KBD", "LABEL", "Q", "SMALL", "BIG", "SUB", "SUP", "TIME", "VAR"];
let clicked = false;


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
    let getParentNode = function(targetNode) {
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

function autoCompSelection() {
    let selectionObj = window.getSelection();
    let selection = selectionObj.toString();
    //console.log("selectionObj: ", selectionObj);
    
    if (!selectionObj.isCollapsed) {
        //console.log("IS NOT COLLAPSED");
        let range = selectionObj.getRangeAt(0);
        //console.log("range: ", range);

        if (selectionObj.anchorNode == selectionObj.focusNode || testRange(range) == true) {
            finalSelection = completeFirstWord(selectionObj.anchorNode, completeLastWord(selectionObj.anchorNode, selection));
        }
        else if (selectionObj.anchorNode != selectionObj.focusNode) {
            let liveNodeList = range.cloneContents().querySelectorAll('*');
            let staticNodeArray = filterSelectedNodes(liveNodeList);
            //console.log("staticNodeArray: ", staticNodeArray);

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
            
            //console.log("selectionList: ", selectionList);
            //console.log("staticNodeArray: ", staticNodeArray);
            //console.log("selectionObj: ", selectionObj);

        }           
    }
    //console.log("======================OUTCOME======================");
    //console.log(finalSelection);
    //console.log("***************************************************");
    return finalSelection;
}

function styleShadowDom(root, selector, properties) {
    let newDeclaration = null;
    if (typeof selector === "number") {
        if (selector > 0 && selector < root.styleSheets[0].cssRules.length-1) {newDeclaration = root.styleSheets[0].cssRules[selector].style}
        else {
            console.log("ERROR: the index '" + selector + "' is out of range.")
            return;
        }
    }
    else if (typeof selector === "string") {
        for (let i=0; i<root.styleSheets[0].cssRules.length; i++) {
            if (selector == root.styleSheets[0].cssRules[i].selectorText) {
                newDeclaration = root.styleSheets[0].cssRules[i].style
                break;
            }
            
            if (i == root.styleSheets[0].cssRules.length-1) {
                console.log("ERROR: the selector '" + selector + "' does not exist.");
                return;
            }
        }
    }
    else {
        console.log("ERROR: the datatype of selector '" + selector + "' is invalid.")
        return;
    }

    if (properties.length == 0) {console.log("ERROR: empty property array given")}
    else if (properties.length == 1) {newDeclaration.setProperty(properties[0][0], properties[0][1])}
    else {
        for (let j=0; j<properties.length; j++) {
            newDeclaration.setProperty(properties[j][0], properties[j][1]);
        }
    }

}

function updateCharCount() {
    let countLimit = 200; 
    selectionList = [];
    
    let currentSelection = autoCompSelection();
    let charCount = currentSelection.length;

    shadowRoot.querySelector("#char-count-value.char-count").innerText = charCount;

    if (charCount > countLimit) {
        styleShadowDom(shadowRoot, "#char-count-container", [
            ["left", event.clientX + 75 + "px"],
            ["top", event.clientY + 50 + "px"],
            ["background-color", "rgb(255, 96, 96)"]
        ]);
    }
    else {
        styleShadowDom(shadowRoot, "#char-count-container", [
            ["left", event.clientX + 75 + "px"],
            ["top", event.clientY + 50 + "px"],
            ["background-color", "rgb(230, 230, 230)"]
        ]);
    }
}

function begunSelecting() {
    if (clicked == false) {
        let hostElement = document.createElement("div");
        hostElement.id = "host-element"
        $(hostElement).appendTo("body");

        let shadowHost = hostElement;
        shadowRoot = shadowHost.attachShadow({mode: "open"});
        
        let charCountContainer = document.createElement("div");
        charCountContainer.id = "char-count-container";
        charCountContainer.className = "char-count";
        charCountContainer.innerHTML = `
            <p class="char-count char-count-text"><span id="char-count-value" class="char-count char-count-text"></span>/200</p>
        `;

        let charCountStyles = document.createElement("style");
        charCountStyles.innerText = `
            #char-count-container {
                position: fixed;
                height: 25px;
                width: 100px;
                background-color: rgb(230, 230, 230);
                padding: 0px;
                border-radius: 2.5px 10px;
                z-index: 100
            }

            .char-count-text {
                margin-top: 0px;
                font-family: calibri, sans-serif;
                font-size: 20px
            }
            
            .char-count {
                text-align: center
            }

            .hidden {
                display: none
            }
        `;

        shadowRoot.appendChild(charCountStyles);
        shadowRoot.appendChild(charCountContainer);

        console.log("shadowRoot: ", shadowRoot);
        console.log("document: ", document);
        console.log("charCountContainer: ", charCountContainer);    
    }
    else {
        shadowRoot.querySelector("#char-count-container.char-count").classList.remove("hidden");
    }

    styleShadowDom(shadowRoot, "#char-count-container", [
        ["left", event.clientX + 75 + "px"],
        ["top", event.clientY + 50 + "px"],
    ]);

    clicked = true;
    window.addEventListener("mousemove", updateCharCount);
}


//selection callback function
function doneSelecting() {
    window.removeEventListener("mousemove", updateCharCount);
    window.removeEventListener("mousedown", begunSelecting);
    shadowRoot.querySelector("#char-count-container.char-count").classList.add("hidden");
    
    selectionList = [];
    finalSelection = "";
    
    window.addEventListener("mousedown", begunSelecting);
    window.addEventListener("mouseup", doneSelecting);
}


//event listeners
chrome.runtime.onMessage.addListener(handleContentRequests);
window.addEventListener("mousedown", begunSelecting);
window.addEventListener("mouseup", doneSelecting);

