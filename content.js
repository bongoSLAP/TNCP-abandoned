let selectionList = [];
let autoCompOutcome = "";
let validTags = ["H1", "H2", "H3", "H4", "H5", "H6", "P", "SPAN", "LI", "A", "STRONG", "B", "CITE", "DFN", "EM", "I", "KBD", "LABEL", "Q", "SMALL", "BIG", "SUB", "SUP", "TIME", "VAR"];
let checkSelectMade = undefined;
let updateCharCount = undefined;
let contextMenuContainer = undefined;
let charCountText = undefined;
let selectionMenu = undefined;
let isClicked = false;
let isOverLimit = false;
let isExpanded = false;




//messaging callback to send data between js files
function handleContentRequests(message, sender, sendResponse) {
    if (message.request === "update>headline") {
        let headlineList = document.getElementsByTagName("h1");
        sendResponse({headerValue: headlineList[0].innerText})
    }
    else if (message.request == "reset>selection") {
        selectionList = [];
        autoCompOutcome = "";
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
        let newWholeText = undefined;

        let getNextParent = function(child) {
            let isFinished = false;

            for (let i=0; i<validTags.length; i++) {
                if (child.parentNode.nodeName == validTags[i]) {
                    if (child.parentNode.nodeName == "#text") {
                        newWholeText = child.parentNode.wholeText;
                    }
                    else {
                        newWholeText = child.parentNode.innerText;
                        getNextParent(child.parentNode);
                    }

                    isFinished = true;
                }

                if (isFinished) {
                    return
                }
                else if (!isFinished && i == validTags.length) {
                    console.log("ERROR: tag not accepted");
                }
            }
        };

        getNextParent(targetNode);
        
        if (newWholeText == undefined) {console.log("ERROR: conditions not met at getNextParent")}
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
    let isFinished = false;
    for (let i=0; i<validTags.length; i++) {
        if (range.commonAncestorContainer.nodeName == validTags[i]) {
            isFinished = true;
        }

        if (isFinished) {
            return true;
        }
        else if (!isFinished && i == validTags.length) {
            return false;
        }
    }
}

function completeFirstWord(targetNode, selection) {
    let context = searchForContext(targetNode, selection);
    fullText = context[0];
    let startChar = context[1];

    if (fullText.charAt(startChar-1) != " " && startChar != 0) {
        while (fullText.charAt(startChar-1) != " " && startChar > 0) {
            selection = fullText.charAt(startChar-1).concat(selection);
            startChar--;
        }
    }
    
    return selection;
}

function completeLastWord(targetNode, selection) {
    let context = searchForContext(targetNode, selection);
    fullText = context[0];
    let startChar = context[1];
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
            autoCompOutcome = completeFirstWord(selectionObj.anchorNode, completeLastWord(selectionObj.anchorNode, selection));
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
            autoCompOutcome = selectionList.join(" ");
            
            //console.log("selectionList: ", selectionList);
            //console.log("staticNodeArray: ", staticNodeArray);
            //console.log("selectionObj: ", selectionObj);

        }           
    }
    //console.log("======================OUTCOME======================");
    //console.log(autoCompOutcome);
    //console.log("***************************************************");
    return autoCompOutcome;
}

function styleShadowDom(root, selector, properties) {
    let newDeclaration = undefined;
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
    else if (properties.length == 1) {
        newDeclaration.setProperty(properties[0][0], properties[0][1])
    }
    else {
        for (let j=0; j<properties.length; j++) {
            newDeclaration.setProperty(properties[j][0], properties[j][1]);
        }
    }
}

function whenNotHovering(element, callback) {
    if (!element.matches(':hover')) {
        callback();
    }
}

function setToMousePos(event) {
    styleShadowDom(shadowRoot, "#context-menu-container", [
        ["left", event.clientX + 75 + "px"],
        ["top", event.clientY + 50 + "px"]
    ]);
}

function begunSelecting() {
    let isSelectMade = false;
    if (!isClicked) {
        let fontRule = document.createElement("style");
        fontRule.innerText = `
            @font-face {
                font-family: "Revalia";
                src: url(` + chrome.runtime.getURL("fonts/Revalia-Regular.ttf") + `) format("truetype");
            }
        `;

        $(fontRule).appendTo("body");

        let hostElement = document.createElement("div");
        hostElement.id = "host-element"
        $(hostElement).appendTo("body");

        let shadowHost = hostElement;
        shadowRoot = shadowHost.attachShadow({mode: "open"});
        
        let container = document.createElement("div");
        container.id = "context-menu-container";
        container.className = "hidden";
        container.innerHTML = `
            <img id="exit-button" class="hidden" src="` + chrome.runtime.getURL("images/exit-button.png") + `" alt="exit" height="15" width="15">
            <p class="char-count char-count-text"><span id="char-count-value" class="char-count char-count-text"></span>/200</p>
            <p id="selection-quotes" class="selection-menu selection-menu-text hidden quotes-font">‘<span id="selection-made" class="selection-menu selection-menu-text"></span>’</p>`
        ;

        let shadowDomStyles = document.createElement("style");
        shadowDomStyles.innerText = `
            #context-menu-container {
                position: fixed;
                height: 25px;
                width: 100px;
                background-color: rgba(230, 230, 230, 0.8);
                padding: 0px;
                border-radius: 2.5px 10px 10px 10px;
                text-align: center;
                z-index: 100
            }

            #exit-button {
                float: right;
                margin-top: 4.5px;
                margin-right: 5px
            }

            #selection-quotes {
                margin-top: 4px;
                margin-left: 7px;
                font-weight: bold;
                font-size: 32px;
                font-family: 'Revalia', cursive;
            }

            #selection-made {
                font-weight: normal;
                font-size: 14px;
                font-family: Arial
            }

            .char-count-text {
                margin-top: 0px;
                font-family: calibri, sans-serif;
                font-size: 20px
            }

            .hidden {
                display: none
            }
            
            .shake-anim {
                animation-name: shake;
                animation-duration: 0.3s;
            }

            @keyframes shake {
                0% {transform: translateX(-20px)}
                20% {transform: translateX(20px)}
                40% {transform: translateX(-20px)}
                60% {transform: translateX(20px)}
                80% {transform: translateX(-20px)}
                100% {transform: translateX(20px)}
            }

            .expand-anim {
                animation-name: expand;
                animation-duration: 0.6s;
                animation-fill-mode: forwards;            
            }

            @keyframes expand {
                0% {
                    height: 25px;
                    width: 100px;
                }
                100% {
                    height: 120px;
                    width: 480px;
                }
            }

            .fadein-anim {
                animation-name: fadein;
                animation-duration: 0.1s;
                animation-fill-mode: forwards;            
            }

            @keyframes fadein {
                0% {opacity: 0}
                100% {opacity: 1}
            }

            .fadeout-anim {
                animation-name: fadeout;
                animation-duration: 0.1s;
                animation-fill-mode: forwards;            
            }

            @keyframes fadeout {
                0% {opacity: 1}
                100% {opacity: 0}
            }

            .quotes-font {
                font-family: 'Revalia', Verdana
            }
        `;

        //shadowRoot.appendChild(header);
        shadowRoot.appendChild(shadowDomStyles);
        shadowRoot.appendChild(container);

        contextMenuContainer = shadowRoot.querySelector("#context-menu-container");
        charCountText = shadowRoot.querySelector(".char-count-text");
        selectionMenu = shadowRoot.querySelector(".selection-menu");

        console.log("shadowRoot: ", shadowRoot);
        console.log("document: ", document);
        console.log("container: ", container);    
        console.log("classList: ", contextMenuContainer.classList.value);
    }
    else {
        if (isExpanded) {
            selectionMenu.classList.add("hidden");
            shadowRoot.querySelector("#exit-button").classList.add("hidden");
            contextMenuContainer.classList.remove("expand-anim");
            charCountText.classList.add("fadein-anim");

            setTimeout(function() {
                charCountText.classList.remove("hidden");
                charCountText.classList.remove("fadein-anim");
            }, 150);

            isExpanded = false;

            console.log("YES");
        }
    }

    checkSelectMade = setInterval(function() {
        let initSelection = window.getSelection().toString();

        if (initSelection.length > 0) {
            isSelectMade = true;
            contextMenuContainer.classList.remove("hidden");
        }
    }, 50);

    updateCharCount = setInterval(function() {
        if (isSelectMade) {
            let countLimit = 200; 
            let rgb = "";
            selectionList = [];

            let currentSelection = autoCompSelection();
            charCount = currentSelection.length;
            shadowRoot.querySelector("#char-count-value.char-count").innerText = charCount;

            if (charCount > countLimit) {
                rgb = "rgba(255, 96, 96, 0.8)"
                isOverLimit = true;
            }
            else {
                rgb = "rgba(230, 230, 230, 0.8)"
                isOverLimit = false;
            }

            styleShadowDom(shadowRoot, "#context-menu-container", [["background-color", rgb]]);
            window.addEventListener("mousemove", setToMousePos);
        }
    }, 100);

    whenNotHovering(contextMenuContainer, function() {
        styleShadowDom(shadowRoot, "#context-menu-container", [
            ["left", event.clientX + 75 + "px"],
            ["top", event.clientY + 50 + "px"],
        ]);
    })
        
    isClicked = true;
}

//selection callback function
function doneSelecting() {
    window.removeEventListener("mousemove", setToMousePos);
    window.removeEventListener("mousedown", begunSelecting);
    clearInterval(checkSelectMade);
    clearInterval(updateCharCount);

    if (isOverLimit) {
        contextMenuContainer.classList.add("shake-anim");

        setTimeout(function() {
            contextMenuContainer.classList.add("fadeout-anim")

            setTimeout(function() {
                contextMenuContainer.classList.add("hidden");
                contextMenuContainer.classList.remove("fadeout-anim");
                contextMenuContainer.classList.remove("shake-anim");
                styleShadowDom(shadowRoot, "#context-menu-container", [["background-color", "rgb(230, 230, 230)"]]);
            }, 150)
        }, 350)
    }
    else {
        let finalSelection = autoCompSelection();
        styleShadowDom(shadowRoot, "#context-menu-container", [["background-color", "rgb(230, 230, 230)"]]);
        charCountText.classList.add("fadeout-anim");
        contextMenuContainer.classList.add("expand-anim");

        setTimeout(function() {
            charCountText.classList.add("hidden");
            charCountText.classList.remove("fadeout-anim");
            selectionMenu.classList.add("fadein-anim");
            shadowRoot.querySelector("#exit-button").classList.add("fadein-anim");
            isExpanded = true;

            setTimeout(function() {
                if (finalSelection.length > 50) {shadowRoot.querySelector("#selection-made.selection-menu").innerText = finalSelection.substr(0, 50) + "...";}
                else {shadowRoot.querySelector("#selection-made.selection-menu").innerText = finalSelection}
                selectionMenu.classList.remove("hidden");
                shadowRoot.querySelector("#exit-button").classList.remove("hidden");

                shadowRoot.querySelector("#exit-button").onclick = function() {
                    contextMenuContainer.classList.add("hidden");
                }
            }, 150)
        }, 150)
    }

    selectionList = [];
    autoCompOutcome = "";
    
    window.addEventListener("mousedown", begunSelecting);
    window.addEventListener("mouseup", doneSelecting);
    console.log("contextMenuContainer.classList: ", contextMenuContainer.classList);
}

//event listeners
chrome.runtime.onMessage.addListener(handleContentRequests);
window.addEventListener("mousedown", begunSelecting);
window.addEventListener("mouseup", doneSelecting);

