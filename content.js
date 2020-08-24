let selectionList = [];
let autoCompOutcome = "";
let validTags = ["H1", "H2", "H3", "H4", "H5", "H6", "P", "SPAN", "LI", "A", "STRONG", "B", "CITE", "DFN", "EM", "I", "KBD", "LABEL", "Q", "SMALL", "BIG", "SUB", "SUP", "TIME", "VAR"];

//shadow DOM elements
let checkSelectMade = undefined;
let updateCharCount = undefined;
let contextMenuContainer = undefined;
let charCountText = undefined;
let selectionMenu = undefined;
let selectionMade = undefined;
let exitButton = undefined;
let confirmButton = undefined;
let radioContainer = undefined;
let radioHeaders = undefined;
let radioButtons = undefined;
let radioLabels = undefined;
let argumentNatureVals = undefined;
let sourceVals = undefined;
let anotationContainer = undefined;
let anotationText = undefined;
let publishButton = undefined;

let isClicked = false;
let isSelectMade = false;
let isOverLimit = false;
let isExpanded = false;
let isConfirmed = false;
let isFocussed = false;


//messaging callback to send data between .js files
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

//line breaks, special chars etc cause errors in searchForContext()
function sanitiseRegExp(string) {
    //filtering out line breaks etc
    string = string.replace(/(\r\n|\n|\r)/gm, "");
    //special chars can be selected and the search will still work
    string = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return string;
}

//need to find the entirety of the text in nodes selected in order to calculate a start point carry out autocomplete function
function searchForContext(targetNode, selection) {
    let fullText = targetNode.wholeText;
    let getParentNode = function(targetNode) {
        let newWholeText = undefined;

        //recursive function to move up the tree of nodes starting from the selected node
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

    //looks to find the point in which the selected text begins in the 'current' whole text
    let newSearch = function(searchIn, query) {
        let regExp = new RegExp(sanitiseRegExp(query));
        let searchOutcome = searchIn.search(regExp);

        if (searchOutcome == -1) {
            return "failed";
        }
        else {return searchOutcome}
    }

    //if it couldnt be found then move up a layer and repeat
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
        let range = selectionObj.getRangeAt(0);

        //if selection stays within the same node
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
        }           
    }
    //console.log("======================OUTCOME======================");
    //console.log(autoCompOutcome);
    //console.log("***************************************************");
    //console.log("selectionObj: ", selectionObj);
    return autoCompOutcome;
}

//function for easily applying styles to shadowDOM
function styleShadowDom(root, selector, properties) {
    let newDeclaration = undefined;

    //multiple types of selectors can be used
    let checkDataType = function(thisSelector) {
        if (typeof thisSelector === "number") {
            if (thisSelector > 0 && thisSelector < root.styleSheets[0].cssRules.length-1) {newDeclaration = root.styleSheets[0].cssRules[thisSelector].style}
            else {
                console.log("ERROR: the index '" + thisSelector + "' is out of range.")
                return;
            }
        }
        else if (typeof thisSelector === "string") {
            for (let i=0; i<root.styleSheets[0].cssRules.length; i++) {
                if (thisSelector == root.styleSheets[0].cssRules[i].selectorText) {
                    newDeclaration = root.styleSheets[0].cssRules[i].style
                    break;
                }
                
                if (i == root.styleSheets[0].cssRules.length-1) {
                    console.log("ERROR: the selector '" + thisSelector + "' does not exist.");
                    return;
                }
            }
        }
        else {
            console.log("ERROR: the datatype of selector '" + thisSelector + "' is invalid.")
            return;
        }
    }

    let applyChanges = function() {
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

    //if an array of selectors then styles must be applied for all items
    if (Array.isArray(selector)) {
        for (let j=0; j<selector.length; j++) {
            checkDataType(selector[j]);
            applyChanges();
        }
    }
    else {
        checkDataType(selector);
        applyChanges();
    }
}

function whenNotHovering(element, callback) {
    if (!element.matches(':hover')) {
        callback();
    }
}

function whenHovering(element, callback) {
    if (element.matches(':hover')) {
        callback();
    }
}

function setToMousePos(event) {
    styleShadowDom(shadowRoot, "#context-menu-container", [
        ["left", event.clientX + 75 + "px"],
        ["top", event.clientY + 50 + "px"]
    ]);
}

function exitButtonInactive() {
    exitButton.src = chrome.runtime.getURL("images/exit-button.png");
}

function exitButtonActive() {
    exitButton.src = chrome.runtime.getURL("images/exit-button-active.png");
    exitButton.addEventListener("mouseout", exitButtonInactive);
}

function exitContextMenu() {
    contextMenuContainer.classList.add("hidden");
}

function confirmChoices() {
    let isArgNatureValid = false;
    let isSourceValid = false;

    //validates that radios are ticked before progressing
    for(let i=0; i<argumentNatureVals.length; i++) {
        if (argumentNatureVals[i].checked) {
            isArgNatureValid = true;
            break;
        }
    }

    for(let i=0; i<sourceVals.length; i++) {
        if (sourceVals[i].checked) {
            isSourceValid = true;
            break;
        }
    }

    //triggers a series of animations to progress to the next screen
    if (isArgNatureValid && isSourceValid) {
        let elemList = [radioButtons, radioLabels];
        isConfirmed = true;
        for (let i=0; i<radioHeaders.length; i++) {
            radioHeaders[i].classList.add("slide-right-anim");
        }

        for (let i=0; i<elemList.length; i++) {
            for(let j=0; j<elemList[i].length; j++) {
                elemList[i][j].classList.add("slide-right-offset-anim");
            }
        }

        setTimeout(function() {
            radioContainer.classList.add("hidden");
            for (let i=0; i<radioHeaders.length; i++) {
                radioHeaders[i].classList.remove("slide-right-anim");
            }
    
            for (let i=0; i<elemList.length; i++) {
                for(let j=0; j<elemList[i].length; j++) {
                    elemList[i][j].classList.remove("slide-right-offset-anim");
                }
            }

            anotationContainer.classList.add("fadein-anim");
            //anotationText.classList.add("fadein-anim");
            //publishButton.classList.add("fadein-anim");

            setTimeout(function() {
                styleShadowDom(shadowRoot, ["#user-anotation-container"], [["display", "inline"]])
                anotationContainer.classList.remove("fadein-anim");
                /*
                anotationText.classList.remove("hidden");
                anotationText.classList.remove("fadein-anim");
                publishButton.classList.remove("hidden");
                publishButton.classList.remove("fadein-anim");
                */
            }, 150)
        }, 550);
    }
    else {alert("You did not confirm all of your choices")}
}

function begunSelecting() {
    //only need to run this set up code the first time a selection is made
    if (!isClicked) {
        //custom font added parent document for use in shadowDOM
        let fontRule = document.createElement("style");
        fontRule.innerText = `
            @font-face {
                font-family: "Revalia";
                src: url(` + chrome.runtime.getURL("fonts/Revalia-Regular.ttf") + `) format("truetype");
            }
        `;

        $(fontRule).appendTo("body");

        //creating, styling and appending shadowDOM to document
        let hostElement = document.createElement("div");
        hostElement.id = "host-element"
        $(hostElement).appendTo("body");

        let shadowHost = hostElement;
        shadowRoot = shadowHost.attachShadow({mode: "open"});
        
        let container = document.createElement("div");
        container.id = "context-menu-container";
        container.className = "hidden";
        container.innerHTML = `
            <div class="char-count">
                <p class="char-count-text"><span id="char-count-value" class="char-count-text"></span>/100</p>
            </div>
            <div id="selection-menu" class="hidden">
                <div class="selection-menu-output">
                    <p id="selection-quotes" class="selection-menu-text hidden quotes-font">‘<span id="selection-made" class="selection-menu-text"></span>’<span><img id="exit-button" class="hidden" src="` + chrome.runtime.getURL("images/exit-button.png") + `" alt="exit" height="15" width="15"></span></p>
                </div>
                <br>
                <div id="radio-container">
                    <div id="argument-nature-container" class="radio-headers">Nature of argument
                        <br>
                        <input class="selection-menu-radios argument-nature-radios" type="radio" id="for-radio" name="argument-nature" value="for">
                        <label class="selection-menu-labels" for="for">For</label>
                        <br>
                        <input class="selection-menu-radios argument-nature-radios" type="radio" id="against-radio" name="argument-nature" value="against">
                        <label class="selection-menu-labels" for="against">Against</label>
                        <br>
                        <input class="selection-menu-radios argument-nature-radios" type="radio" id="other-radio" name="argument-nature" value="other">
                        <label class="selection-menu-labels" for="other">Other</label>
                        <br>
                    </div>
                    <br>
                    <div id="source-container" class="radio-headers">Have a source?
                        <br>
                        <input class="selection-menu-radios source-radios" type="radio" id="yes-source-radio" name="source" value="yes">
                        <label class="selection-menu-labels" for="yes">Yes</label>
                        <br>
                        <input class="selection-menu-radios source-radios" type="radio" id="no-source-radio" name="source" value="no">
                        <label class="selection-menu-labels" for="no">No</label>
                        <br>
                        <button id="confirm-choices">Confirm</button>
                    </div>
                </div>
                
                <div id="user-anotation-container" class="hidden">
                    <textarea id="user-anotation-input" name="user-anotation" rows="6">Your thoughts...
                    </textarea>
                    <br>
                    <input id="publish-anotation" type="submit" value="Publish">
                </div>
            </div>`
        ;

        let shadowDomStyles = document.createElement("style");
        shadowDomStyles.innerText = `
            #context-menu-container {
                position: fixed;
                height: 2%;
                width: 6.5%;
                background-color: rgba(230, 230, 230, 0.8);
                padding: 0px;
                border-radius: 2.5px 10px 10px 10px;
                z-index: 9999
            }
            #exit-button {
                float: right;
                margin-top: 4.5px;
                margin-right: 5px
            }
            #exit-button:hover {
                cursor: pointer
            }
            .selection-menu-output {
                text-align: center
            }
            #selection-quotes {
                margin-top: 4px;
                font-weight: bold;
                font-size: 32px;
                font-family: 'Revalia', cursive;
            }
            #selection-made {
                font-weight: normal;
                font-size: 14px;
                font-family: Arial
            }
            .selection-menu-radios {
                margin-left: 40px
            }
            #argument-nature-container {
                text-align: left;
                margin-left: 20px
            }
            #source-container {
                text-align: left;
                margin-left: 20px
            }
            #confirm-choices {
                margin-left: 10px;
                margin-top: 10px;
            }
            #user-anotation-container {
                margin-top: 0px;
            }
            
            #user-anotation-input {
                margin-top: 10px;
                margin-left: 15%;
                margin-right: 15%;
                width: 70%;
                resize: none
            }
            #publish-anotation {
                margin-left: 15%;
            }
            .char-count {
                text-align: center
            }
            .char-count-text {
                margin-top: 0px;
                font-family: calibri, sans-serif;
                font-size: 20px
            }
            .hidden {
                display: none
            }
            .quotes-font {
                font-family: 'Revalia', Verdana
            }
            
            .shake-anim {
                animation-name: shake;
                animation-duration: 0.3s
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
                animation-fill-mode: forwards       
            }
            @keyframes expand {
                0% {
                    height: 2%;
                    width: 6.5%
                }
                100% {
                    height: 20%;
                    width: 30%;
                }
            }
            .fadein-anim {
                animation-name: fade-in;
                animation-duration: 0.1s;
                animation-fill-mode: forwards        
            }
            @keyframes fade-in {
                0% {opacity: 0}
                100% {opacity: 1}
            }
            .fadeout-anim {
                animation-name: fade-out;
                animation-duration: 0.1s;
                animation-fill-mode: forwards         
            }
            @keyframes fade-out {
                0% {opacity: 1}
                100% {opacity: 0}
            }
            .slide-right-anim {
                animation-name: slide-right;
                animation-duration: 1.5s;
                animation-fill-mode: forwards
            }
            @keyframes slide-right {
                0% {
                    opacity: 1;
                    margin-left: 20px
                }
                40% {opacity: 0}
                100% {
                    margin-left: 400px;
                    opacity: 0
                }
            }
            .slide-right-offset-anim {
                animation-name: slide-right-offset;
                animation-duration: 1.5s;
                animation-fill-mode: forwards
            }
            @keyframes slide-right-offset {
                0% {
                    opacity: 1;
                    margin-left: 40px
                }
                40% {opacity: 0}
                100% {
                    margin-left: 400px;
                    opacity: 0
                }
            }
        `;

        //shadowRoot.appendChild(header);
        shadowRoot.appendChild(shadowDomStyles);
        shadowRoot.appendChild(container);

        //saves repeating querySelector + readability
        contextMenuContainer = shadowRoot.querySelector("#context-menu-container");
        charCountText = shadowRoot.querySelector(".char-count-text");
        selectionMenu = shadowRoot.querySelector("#selection-menu");
        selectionMade = shadowRoot.querySelector("#selection-made");
        radioContainer = shadowRoot.querySelector("#radio-container");
        radioHeaders = shadowRoot.querySelectorAll(".radio-headers");
        radioButtons = shadowRoot.querySelectorAll(".selection-menu-radios");
        radioLabels = shadowRoot.querySelectorAll(".selection-menu-labels");
        exitButton = shadowRoot.querySelector("#exit-button");
        exitButton.addEventListener("click", exitContextMenu);
        confirmButton = shadowRoot.querySelector("#confirm-choices");
        confirmButton.addEventListener("click", confirmChoices);
        argNatureContainer = shadowRoot.querySelector("#argument-nature-container")
        sourceContainer = shadowRoot.querySelector("#source-container")
        argumentNatureVals = shadowRoot.querySelectorAll(".argument-nature-radios");
        sourceVals = shadowRoot.querySelectorAll(".source-radios");
        anotationContainer = shadowRoot.querySelector("#user-anotation-container");
        anotationText = shadowRoot.querySelector("#user-anotation-input");
        publishButton = shadowRoot.querySelector("#publish-anotation");
        
        console.log("shadowRoot: ", shadowRoot);
        console.log("document: ", document);
        //console.log("container: ", container);    
        //console.log("classList: ", contextMenuContainer.classList.value);
    }
    else {
        //if already clicked once, just need to hide/unhide elements rather than creating them every time
        whenNotHovering(contextMenuContainer, function() {
            if (isExpanded) {
                styleShadowDom(shadowRoot, ["#selection-quotes", "#exit-button", "#argument-nature-container", "#source-container"], [["display", "none"]]);    
                if (isConfirmed) {styleShadowDom(shadowRoot, ["#user-anotation-container"], [["display", "none"]])}

                contextMenuContainer.classList.remove("expand-anim");
                charCountText.classList.add("fadein-anim");
    
                setTimeout(function() {
                    charCountText.classList.remove("hidden");
                    charCountText.classList.remove("fadein-anim");
                }, 150);
            }
        })
    }

    
    whenHovering(contextMenuContainer, function() {
        isFocussed = true;
    });

    //checks to see whether mouse events lead to a selection being made or just normal click
    checkSelectMade = setInterval(function() {
        whenNotHovering(contextMenuContainer, function() {
            let initSelection = window.getSelection().toString();

            if (initSelection.length > 0) {
                isSelectMade = true;
                contextMenuContainer.classList.remove("hidden");
            }
            else {
                isSelectMade = false
            }
        })
    }, 50);

    //displays the current character count of selection being made
    updateCharCount = setInterval(function() {
        if (isSelectMade) {
            let countLimit = 100; 
            let rgb = "";
            selectionList = [];

            let currentSelection = autoCompSelection();
            charCount = currentSelection.length;
            
            shadowRoot.querySelector("#char-count-value").innerText = charCount;

            if (charCount > countLimit) {
                rgb = "rgba(255, 96, 96, 0.8)"
                isOverLimit = true;
            }
            else {
                rgb = "rgba(230, 230, 230, 0.8)"
                isOverLimit = false;
            }

            styleShadowDom(shadowRoot, "#context-menu-container", [["background-color", rgb]]);
            whenNotHovering(contextMenuContainer, function() {
                if (!isFocussed) {
                    window.addEventListener("mousemove", setToMousePos)
                }
            });
        }
    }, 100);

    //allows user to 'click out' of context menu
    whenNotHovering(contextMenuContainer, function() {
        styleShadowDom(shadowRoot, "#context-menu-container", [
            ["left", event.clientX + 75 + "px"],
            ["top", event.clientY + 50 + "px"],
        ]);
    })
        
    isClicked = true;
    //console.log("isSelectMade: ", isSelectMade);
    //console.log("shadowRoot: ", shadowRoot);
}

//selection callback function
function doneSelecting() {
    window.removeEventListener("mousemove", setToMousePos);
    window.removeEventListener("mousedown", begunSelecting);
    clearInterval(checkSelectMade);
    clearInterval(updateCharCount);

    //if selection more than 100 chars, then appropriate animation displayed
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
        if (isSelectMade) {
            //triple clicks cause weird bugs
            whenNotHovering(contextMenuContainer, function() {if (event.detail === 3) {contextMenuContainer.classList.add("hidden")}});

            let finalSelection = autoCompSelection();
            styleShadowDom(shadowRoot, "#context-menu-container", [["background-color", "rgb(230, 230, 230)"]]);
            charCountText.classList.add("fadeout-anim");
            contextMenuContainer.classList.add("expand-anim");

            setTimeout(function() {
                charCountText.classList.add("hidden");
                charCountText.classList.remove("fadeout-anim");
                selectionMenu.classList.add("fadein-anim");
                exitButton.classList.add("fadein-anim");
                isExpanded = true;

                setTimeout(function() {
                    whenNotHovering(contextMenuContainer, function() {
                        if (!isFocussed) {
                            //displays first 50 chars of selection to save space
                            if (finalSelection.length > 50) {selectionMade.innerText = finalSelection.substr(0, 50) + "...";}
                            else {selectionMade.innerText = finalSelection}
                            radioContainer.classList.remove("hidden");
                            styleShadowDom(shadowRoot, ["#selection-quotes", "#exit-button", "#argument-nature-container", "#source-container"], [["display", "inline"]]);
                            exitButton.addEventListener("mouseover", exitButtonActive);
                        }
                    });
                    selectionMenu.classList.remove("hidden");   
                }, 150)
            }, 150)
        }
        else {
            contextMenuContainer.classList.add("hidden")
        }
    }

    selectionList = [];
    autoCompOutcome = "";
    //isSelectMade = false;
    
    window.addEventListener("mousedown", begunSelecting);
    window.addEventListener("mouseup", doneSelecting);
}

//event listeners
chrome.runtime.onMessage.addListener(handleContentRequests);
window.addEventListener("mousedown", begunSelecting);
window.addEventListener("mouseup", doneSelecting);