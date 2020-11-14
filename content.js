let selectionList = [];
let submissionCache = []
let blockLevelTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'TABLE', 'FORM', 'ARTICLE', 'VIDEO', 'FIGURE', 'NAV', 'ADDRESS', 'ASIDE', 'BLOCKQUOTE', 'CANVAS', 'DD', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'HEADER', 'FOOTER', 'HR', 'MAIN', 'NOSCRIPT', 'PRE', 'SECTION', 'TABLE', 'TFOOT'];
let inlineTags = ['A', 'SPAN', 'I', 'Q', 'B', 'STRONG', 'SUB', 'SUP', 'LABEL', 'SCRIPT', 'TEXTAREA', 'IMG', 'ABBR', 'ACRONYM', 'BIG', 'BR', 'BIG', 'CITE', 'BUTTON', 'EM', 'INPUT', 'OUTPUT', 'VAR', 'TT', 'TIME', 'SELECT', 'SAMP', 'OUTPUT', 'OBJECT', 'MAP', 'KBD', 'DFN', 'CODE', 'BDO'];
let punctuation = ['.', '?', '!', ',', ';', ':', '-', '—', ' ']; //include brackets, quotes etc? not sure
let insertions = {};
let emptyVal = ''
let parentElemInDoc = undefined;
let nodeChunks = undefined;
let anchorTag = undefined;

//user data objects
let annotation = {
    annotationId: '',
    textAnnotated: '',
    isUnified: true,
    isContainingChildren: false,
    urlOfArticle: '',
    anchor: {},
    focus: {}
}

let submission = {
    submissionId: '',
    assignedTo: '', 
    argumentNature: '',
    submissionText: '',
    isSource: false,
    sourceLink: undefined
}

//intervals
let checkSelectMade = undefined;
let updateCharCount = undefined;

//parent DOM elements
let parentDocStyle = undefined;

//shadow DOM vars/elements
let userInputShadowRoot = undefined;
let viewSubmissionShadowRoot = undefined;

let userInputContextMenuContainer = undefined;
let charCountText = undefined;
let selectionMenu = undefined;
let selectionMade = undefined;
let radioContainer = undefined;
let radioHeaders = undefined;
let userInputExitButton = undefined;
let argumentNatureVals = undefined;
let sourceVals = undefined;
let annotationContainer = undefined;
let submissionInput = undefined;
let sourceInput = undefined;

let tail = undefined;
let viewSubmissionContextMenuContainer = undefined;
let viewSubmissionInnerContainer = undefined;
let viewSubmissionText = undefined;
let viewSubmissionSource = undefined;
let viewSubmissionSourceContainer = undefined;
let viewSubmissionExitButton = undefined;

//bools
let isUserInputDomCreated = false;
let isViewSubmissionDomCreated = false;
let isSelectMade = false;
let isOverLimit = false;
let isExpanded = false;
let isConfirmed = false;
let isFocussed = false;
let isAbortSelection = false;
let isExitButtonClicked = false;

//messaging callback to send data between .js files
function handleContentRequests(message, sender, sendResponse) {
    if (message.request === 'update>headline') {
        let headlineList = document.getElementsByTagName('h1');
        sendResponse({headerValue: headlineList[0].innerText})
    }
}

//line breaks, special chars etc cause errors in searchForContext()
function sanitiseRegExp(string) {
    //filtering out line breaks etc
    string = string.replace(/(\r\n|\n|\r)/gm, '');
    //special chars can be selected and the search will still work
    string = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return string;
}

//generates a random unique id
function generateId(type) {
    let id = Math.random().toString(36).substr(2, 9);

    //need to check is id already in database? if no then:

    if (type == 'annotation') {
        return 'ANT' + id
    }
    else if (type == 'submission') {
        return 'SUB' + id
    }
    else {
        console.log('ERROR: Invalid type');
    }

}

//looks to find the point in which the selected text begins in the 'this' whole text
function newSearch(searchIn, query) {
    let regExp = new RegExp(sanitiseRegExp(query));
    let searchOutcome = searchIn.search(regExp);

    if (searchOutcome == -1) {
        return 'failed';
    }
    else {return searchOutcome}
}

function getParentElement(targetNode) {
    //console.log('targetNode: ', targetNode);
    //console.log('=========================================')
    let finalParent = undefined;

    let getNextParent = function(child) {
        //console.log('#############################')
        let parent = undefined;
        let sibling = undefined;

        //console.log('child before: ', child);

        //this li condition casuing the issue i think
        if (child.nodeName != 'LI') {
            //check whether there are siblings adjacent to targetNode
            if (child.nextElementSibling != null && child.previousElementSibling != null) {sibling = 'both'}
            else if (child.nextElementSibling != null && child.previousElementSibling == null) {sibling = child.nextElementSibling}
            else if (child.nextElementSibling == null && child.previousElementSibling != null) {sibling = child.previousElementSibling}
            else if (child.nextElementSibling == null && child.previousElementSibling == null) {
                let isFinished = false;
                //console.log('both null');

                //console.log('child.nodeName at both null: ', child.nodeName);
                //block level elements cannot be nested, so if it matches an item in blockLevelTags (list of block level elements), then this is the parent
                for (let i=0; i<blockLevelTags.length; i++) {
                    if (child.nodeName == blockLevelTags[i]) {
                        finalParent = child;
                        isFinished = true;
                        //console.log('finished true')
                    }

                    if (isFinished) {
                        sibling = 'both null';
                        break;
                    }
                    else if (!isFinished && i == blockLevelTags.length-1) {
                        //console.log('fetching next parent elem')
                        getNextParent(child.parentNode);
                    }
                }
            }
        }

        //console.log('child after: ', child);
        //console.log('sibling variable: ', sibling);
        //console.log('siblings: ', child.previousElementSibling, child.nextElementSibling);

        if (sibling != undefined) {

            //check whether the text in targetNode is present in adjacent (sibling) elements
            //if so, we havent found the outermost element. it is only when this is not the case that the parent element is found
            if (sibling != 'both' && sibling != 'both null') {
                if (newSearch(child.parentNode.innerText, sibling.innerText) != 'failed') {
                    parent = child.parentNode;
                    getNextParent(parent);
                }
                else {
                    finalParent = child;
                    return;
                }
            }
            else if (sibling == 'both') {
                //console.log('is both');
                let fullText = undefined;

                //may run into issues here in future beacause of .parentNode not sure
                if (child.parentNode.nodeName == '#text') {fullText = child.parentNode.wholeText;}
                else {fullText = child.parentNode.innerText}

                //console.log('child at both: ', child);
                //console.log('both sibling search: ', newSearch(fullText, child.nextElementSibling.innerText), newSearch(fullText, child.previousElementSibling.innerText));
                if (newSearch(fullText, child.nextElementSibling.innerText) != 'failed' && newSearch(fullText, child.previousElementSibling.innerText) != 'failed') {
                    parent = child.parentNode;
                    getNextParent(parent);
                }
                else {
                    if (child.nodeName == '#text') {finalParent = child.parentNode}
                    else {finalParent = child};
                    return;
                }
            }
            else if (sibling == 'both null') {
                //if both siblings are null, it is likely that child is a single inline tag nested within an x amount of other inline tags and a block level tag, so repeat for parent
                for (let i=0; i<inlineTags.length; i++) {
                    if (child.nodeName == inlineTags[i]) {
                        getNextParent(child.parentNode);
                    }
                }
            }
        }
        else {
            //if child is an li we can assume that parent will be a ul so its much less complicated

            //console.log('child at li condition: ', child);
            if (child.parentNode.nodeName == 'UL') {
                finalParent = child;
            }
            else {getNextParent(child.parentNode)}
        }
    }

    getNextParent(targetNode);
    if (finalParent == undefined) {console.log('ERROR: conditions not met at getNextParent')}
    return finalParent;
}



//need to find the entirety of the text in nodes selected in order to calculate a start point carry out autocomplete function
function searchForContext(targetNode, selection) {
    let fullText = targetNode.wholeText;

    //if it couldnt be found then use parent
    if (newSearch(fullText, selection.trim()) == 'failed') {     
        fullText = getParentElement(targetNode).innerText;
    }

    let indexFound = newSearch(fullText, selection.trim());
    return [fullText, indexFound];
}

//is the furthest element in the tree where the anchor and focus nodes are both contained in a text element
function testRange(range) {
    let isFinished = false;
    for (let i=0; i<blockLevelTags.length; i++) {
        if (range.commonAncestorContainer.nodeName == blockLevelTags[i]) {
            isFinished = true;
        }

        if (isFinished) {
            return true;
        }                              //needs length-1 here
        else if (!isFinished && i == blockLevelTags.length) {
            return false;
        }
    }
}

//autocompletes the first and last words of the selection
function completeFirstWord(targetNode, selection) {
    let context = searchForContext(targetNode, selection);
    let startPoint = context[1];
    let fullText = context[0];
    let found = false;

    if (fullText.charAt(startPoint-1) != ' ' && startPoint != 0) {
        while (!found && startPoint > 0) {
            for (let i=0; i<punctuation.length; i++) {
                if (fullText.charAt(startPoint-1) == punctuation[i]) {
                    found = true
                    break;
                }
            }

            if (!found) {
                selection = fullText.charAt(startPoint-1).concat(selection);
                startPoint--;
            }
        }
    }
    
    return selection;
}

function completeLastWord(targetNode, selection) {
    let context = searchForContext(targetNode, selection);
    let startPoint = context[1];
    let endPoint = startPoint + selection.length;
    let fullText = context[0];
    let found = false;

    if (fullText.charAt(endPoint) != ' ' && fullText.charAt(endPoint-1) != ' ') {
        while (!found && endPoint < fullText.length) {
            for (let i=0; i<punctuation.length; i++) {
                if (fullText.charAt(endPoint) == punctuation[i]) {
                    found = true
                    break;
                }
            }

            if (!found) {
                selection = selection.concat(fullText.charAt(endPoint));
                endPoint++;
            }
        }
    }

    return selection;
}

//pushes the elements inbetween the anchor and focus to the selectionList array
function pushFilteredElems(staticArray) {
    if (staticArray.length > 2) {
        for (let i=1; i<staticArray.length-1; i++) {
            selectionList.push(staticArray[i].innerText);
        }
    }
}

//filters out non block level tags
function filterSelectedNodes(liveList) {
    let staticArray = [];
    let textTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'];

    for (let i=0; i<liveList.length; i++) {
        for (let j=0; j<textTags.length; j++) {
            if (liveList[i].tagName == textTags[j]) {staticArray.push(liveList[i])}
        }
    }

    return staticArray;
}

//gets a live list of nodes that make up the selection
function getAllNodes(object) {
    let liveNodeList = object.getRangeAt(0).cloneContents().querySelectorAll('*');
    return filterSelectedNodes(liveNodeList);
}

//autocompletes boundary words (anchor + focus), and concatenates each node into a single string
function autoCompSelection() {
    let thisSelectionObj = window.getSelection();
    let selection = thisSelectionObj.toString();
    let autoCompOutcome = undefined;
    
    if (!thisSelectionObj.isCollapsed) {
        //if selection stays within the same element or not
        if (thisSelectionObj.anchorNode == thisSelectionObj.focusNode || testRange(thisSelectionObj.getRangeAt(0)) == true) {
            autoCompOutcome = completeFirstWord(thisSelectionObj.anchorNode, completeLastWord(thisSelectionObj.anchorNode, selection.trim()));
        }
        else if (thisSelectionObj.anchorNode != thisSelectionObj.focusNode) {
            let staticNodeArray = getAllNodes(thisSelectionObj);

            //if selection went up the page from starting point or down the page from starting point
            if (thisSelectionObj.anchorNode.wholeText.search(staticNodeArray[staticNodeArray.length-1].innerText) == -1) {
                selectionList.push(completeFirstWord(thisSelectionObj.anchorNode, staticNodeArray[0].innerText));
                pushFilteredElems(staticNodeArray);
                selectionList.push(completeLastWord(thisSelectionObj.focusNode, staticNodeArray[staticNodeArray.length-1].innerText));
            }
            else {
                selectionList.push(completeFirstWord(thisSelectionObj.focusNode, staticNodeArray[0].innerText));
                pushFilteredElems(staticNodeArray);
                selectionList.push(completeLastWord(thisSelectionObj.anchorNode, staticNodeArray[staticNodeArray.length-1].innerText));
            }  
            
            //concatenating text values of filtered selected elements
            autoCompOutcome = selectionList.join(' ')
            
        }           
    }
    return autoCompOutcome;
}

//for easily applying multiple styles to shadowDOM
function styleShadowDom(root, selector, properties) {
    let newDeclaration = undefined;

    //multiple types of selectors can be used
    let checkDataType = function(thisSelector) {
        if (typeof thisSelector === 'number') {
            if (thisSelector > 0 && thisSelector < root.styleSheets[0].cssRules.length-1) {newDeclaration = root.styleSheets[0].cssRules[thisSelector].style}
            else {
                console.log("ERROR: the index '" + thisSelector + " is out of range.")
                return;
            }
        }
        else if (typeof thisSelector === 'string') {
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

    //the individual properties are set here
    let applyChanges = function() {
        if (properties.length == 0) {console.log('ERROR: empty property array given')}
        else if (properties.length == 1) {
            newDeclaration.setProperty(properties[0][0], properties[0][1])
        }
        else {
            for (let j=0; j<properties.length; j++) {
                newDeclaration.setProperty(properties[j][0], properties[j][1]);
            }
        }
    }

    //allows for multiple selectors to be used
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
    styleShadowDom(userInputShadowRoot, '#user-input-context-menu-container', [
        ['left', event.clientX + 75 + 'px'],
        ['top', event.clientY + 50 + 'px']
    ]);
}

function exitButtonInactive(event) {
    if (event.target.id == 'user-input-exit-button') {userInputExitButton.src = chrome.runtime.getURL('images/exit-button.png')}
    else if (event.target.id == 'view-submission-exit-button') {viewSubmissionExitButton.src = chrome.runtime.getURL('images/exit-button.png')}
}

function exitButtonActive(event) {
    if (event.target.id == 'user-input-exit-button') {
        userInputExitButton.src = chrome.runtime.getURL('images/exit-button-active.png');
        userInputExitButton.addEventListener('mouseout', exitButtonInactive);
    }
    else if (event.target.id == 'view-submission-exit-button') {
        viewSubmissionExitButton.src = chrome.runtime.getURL('images/exit-button-active.png');
        viewSubmissionExitButton.addEventListener('mouseout', exitButtonInactive);
    }
}

//exit button click function
function exitContextMenu(event) {
    if (event.target.id == 'user-input-exit-button') {userInputContextMenuContainer.classList.add('hidden')}
    else if (event.target.id == 'view-submission-exit-button') {
        viewSubmissionContextMenuContainer.classList.add('hidden');
        isExitButtonClicked = true;
    }
}

//confirm button click function
function confirmChoices() {
    let isArgNatureValid = false;
    let isSourceValid = false;
    let selectedVals = [];

    //validates that radios are ticked before progressing
    for (let i=0; i<argumentNatureVals.length; i++) {
        if (argumentNatureVals[i].checked) {
            selectedVals.push(argumentNatureVals[i].value)
            isArgNatureValid = true;
            break;
        }
    }

    for (let i=0; i<sourceVals.length; i++) {
        if (sourceVals[i].checked) {
            selectedVals.push(sourceVals[i].value)
            isSourceValid = true;
            break;
        }
    }

    //triggers a series of animations to progress to the next screen
    if (isArgNatureValid && isSourceValid) {
        submission.argumentNature = selectedVals[0];
        
        if (selectedVals[1] == 'yes') {submission.isSource = true}
        else {submission.isSource = false}

        let elemList = [userInputShadowRoot.querySelectorAll('.selection-menu-radios'), userInputShadowRoot.querySelectorAll('.selection-menu-labels')];
        isConfirmed = true;
        for (let i=0; i<radioHeaders.length; i++) {
            radioHeaders[i].classList.add('slide-right-anim');
        }

        for (let i=0; i<elemList.length; i++) {
            for (let j=0; j<elemList[i].length; j++) {
                elemList[i][j].classList.add('slide-right-offset-anim');
            }
        }

        setTimeout(function() {
            radioContainer.classList.add('hidden');
            for (let i=0; i<radioHeaders.length; i++) {
                radioHeaders[i].classList.remove('slide-right-anim');
            }
    
            for (let i=0; i<elemList.length; i++) {
                for (let j=0; j<elemList[i].length; j++) {
                    elemList[i][j].classList.remove('slide-right-offset-anim');
                }
            }

            annotationContainer.classList.add('fadein-anim');

            setTimeout(function() {
                if (!submission.isSource) {sourceInput.classList.add('hidden');}

                styleShadowDom(userInputShadowRoot, ['#user-annotation-container'], [['display', 'inline']]);
                annotationContainer.classList.remove('fadein-anim');
            }, 150)
        }, 550);
    }
    else {alert('You did not confirm all of your choices')}
}

//finds the nodes in the parent docoument using the snapshots of data in the annotation object (cant call methods on the annotation object data as it is just strings and arrays etc not actual nodes)
function findElement(type, targetNode) {
    let searchArea = [];
    let found = false;

    //if finding the anchor and focus nodes in document, use annotation data to find element, if finding middle elements, use the parentElemInDoc value that was found from the previous findElement() call in findAnnotation(object, 'anchor')
    if (type != 'middle') {
        console.log('targetNode: ', targetNode);
        if (targetNode.nodeType != 1) {
            searchArea = document.querySelectorAll(targetNode.parentNode.nodeName.toLowerCase());
        }
        else {
            searchArea = document.querySelectorAll(targetNode.nodeName.toLowerCase());
        }

        for (let i=0; i<searchArea.length; i++) {
            if (searchArea[i].innerText == targetNode.parentNode.parentWholeText) {
                found = true;
                return searchArea[i];
            }
        }

        if (!found) {
            console.log('findElement()| ERROR: could not find annotation: ', object.textAnnotated)
            return;
        }
    }
    else {
        //(previous parentElemInDoc value)
        console.log('findElement| parentElemInDoc.children: ', parentElemInDoc.children);
        for (let i=0; i<parentElemInDoc.children.length; i++) {
            if (parentElemInDoc.children[i].innerText == targetNode) {
                return parentElemInDoc.children[i];
            }
        }
    }
}

function resetAnnotation() {
    annotation = {
        annotationId: '',
        textAnnotated: '',
        isUnified: true,
        isContainingChildren: false,
        urlOfArticle: '',
        anchor: {},
        focus: {},
    }
}

//initialises the annotation object to take a snapshot of actual values situated in the DOM
function initAnnotation(object, selection) {
    console.log('object in initAnnotation: ', object);
    annotation.textAnnotated = selection;

    annotation.anchor = {
        nodeName: object.anchorNode.nodeName,
        nodeType: object.anchorNode.nodeType,
        wholeText: object.anchorNode.wholeText,
        parentNode: null
    };

    if (object.anchorNode.parentNode.nodeName != 'BODY') {
        annotation.anchor.parentNode = {
            nodeName: object.anchorNode.parentNode.nodeName,
            nodeType: object.anchorNode.parentNode.nodeType,
            parentWholeText: object.anchorNode.parentNode.innerText
        };
    }

    if (object.anchorNode.wholeText != object.focusNode.wholeText) {annotation.isUnified = false}

    //if selections spans multiple elements, then capture a snapshot of data for focus node to object
    //this condition needs to be better (i dont know why this works)
    if (getParentElement(findElement('anchor', annotation.anchor)).children.length >= 1) {
        annotation.isContainingChildren = false;
        annotation.focus = {
            nodeName: object.focusNode.nodeName,
            nodeType: object.focusNode.nodeType,
            wholeText: object.focusNode.wholeText,
            parentNode: null
        };

        if (object.focusNode.parentNode.nodeName != 'BODY') {
            annotation.focus.parentNode = {
                nodeName: object.focusNode.parentNode.nodeName,
                nodeType: object.focusNode.parentNode.nodeType,
                parentWholeText: object.focusNode.parentNode.innerText
            };
        }
    }
    else {delete annotation.focus}

    /*
    let nodeList = getAllNodes(object);

    //if selection spans multiple block level elemets, then get these elements and capture a snapshot of this data for the object 
    if (nodeList.length != 0) {
        for (let i=0; i<nodeList.length; i++) {
            let node = {
                nodeName: nodeList[i].nodeName,
                nodeType: nodeList[i].nodeType,
                wholeText: nodeList[i].innerText
            }

            annotation.nodeList.push(node);
        }
    }
    else {delete annotation.nodeList}
    */

    annotation.annotationId = generateId('annotation');
}

//calculate offset of clicked element and UI, sets UI position to this offset
function setUiAtAnnotationPos(span) {
    let uiProperties = window.getComputedStyle(viewSubmissionInnerContainer, null);
    let uiYOffset = parseFloat(uiProperties.height.split('px')[0]);
    let uiXOffset = parseFloat(uiProperties.width.split('px')[0]);

    let uiTailProperties = window.getComputedStyle(tail, null);
    let uiTailYOffset = parseFloat(uiTailProperties.borderBottom.split('px')[0]);

    uiYOffset += uiTailYOffset;

    let bodyBounds = document.body.getBoundingClientRect();
    let elementBounds = span.getBoundingClientRect();

    let top = elementBounds.bottom - bodyBounds.bottom + 6;
    let left = elementBounds.left + elementBounds.width / 2 - uiXOffset / 2;
    
    //only account for uiYoffset when exit button is not clicked
    //this is because the body.bottom value will change to account for this offset once the exit button is clicked and the ui is hidden
    if (!isExitButtonClicked) {top += uiYOffset}
    else {isExitButtonClicked = false}

    styleShadowDom(viewSubmissionShadowRoot, '#view-submission-context-menu-container', [
        ['top', top + 'px'],
        ['left', left + 'px']
    ]);
}

function viewSubmission(span) {
    //only need to run this set up code the first time a selection is made
    if (!isViewSubmissionDomCreated) {

        //creating, styling and appending shadowDOM to document
        let hostElement = document.createElement('div');
        hostElement.id = 'view-submission-host-element';
        $(hostElement).appendTo('body');

        let shadowHost = hostElement;
        viewSubmissionShadowRoot = shadowHost.attachShadow({mode: 'open'}); 
        
        let container = document.createElement('div');
        container.id = 'view-submission-context-menu-container';
        container.innerHTML = `
            <div id="tail"></div>
            <div id="completed-submission-container">
                <div id="user-info-container">
                    <p id="user-name-label">User: <span id="user-name">jim</span></p>
                    <p id="karma-score-label">Karma: <span id="karma-score">-34</span></p>
                </div>
                <img id='view-submission-exit-button' src='` + chrome.runtime.getURL('images/exit-button.png') + `' alt='exit'>
                <div id="control-panel">
                    <div id="control-panel-buttons">
                        <img class="control-panel-button" id='cycle-submission-button' src='` + chrome.runtime.getURL('images/cycle-submissions.png') + `'>
                        <img class="control-panel-button" id='upvote-button' src='` + chrome.runtime.getURL('images/upvote.png') + `'>
                        <img class="control-panel-button" id='downvote-button' src='` + chrome.runtime.getURL('images/downvote.png') + `'>
                        <img class="control-panel-button" id='helpful-button' src='` + chrome.runtime.getURL('images/helpful.png') + `'>
                        <img class="control-panel-button" id='report-button'  src='` + chrome.runtime.getURL('images/report.png') + `'>
                    </div>
                    <div id="control-panel-counters">
                        <p class="control-panel-counter" id="cycle-submission-count"></p>
                        <p class="control-panel-counter" id="upvote-count"></p>
                        <p class="control-panel-counter" id="downvote-count"></p>
                        <p class="control-panel-counter" id="helpful-count"></p>
                    </div>
                </div>
                <div id="submission-text-container">
                    <h3 id="submission-text-label">Submission:</h3>
                    <p id="submission-text"></p>
                    <div id="submission-source-container">
                        <h4 id="submission-source-label">Source:</h4>
                        <a id="submission-source"></a>
                    </div>
                </div>
            </div>
        `;

        let shadowDomStyles = document.createElement('style');
        shadowDomStyles.innerText = `
            #view-submission-context-menu-container {
                position: relative;
                font-family: Tahoma, Geneva, sans-serif;
                z-index: 10000
            }
            
            #tail {
                width: 0;
                height: 0;
                margin-bottom: -20px
            }
            
            #completed-submission-container {
                padding-bottom: 4px;
                background-color: rgb(240, 240, 240)
            }

            #view-submission-exit-button:hover {
                cursor: pointer
            }
            
            .control-panel-button {
                border-radius: 10%
            }

            .hidden {
                display: none
            }
            
            @media screen and (min-resolution: 350dpi) {
                #tail {
                    margin-left: 22.5px;
                    border-left: 1.25px solid transparent;
                    border-right: 1.25px solid transparent;
                    border-bottom: 2.5px solid  blue
                }

                #view-submission-exit-button {
                    width: 3px;
                    height: 3px;
                    float: right;
                    margin-top: -4.6px;
                    margin-right: 1px
                }
            
                #completed-submission-container {
                    height: 31.25px;
                    width: 50px;
                    border-radius: 2.5px;
                    font-size: 2.5px
                }
            
                #user-info-container {
                    height: 11%;
                    width: 100%;
                    margin-top: 20px;
                    border-radius: 2.5px 2.5px 0px 0px;
                    border-bottom: 0.25px solid rgb(200, 200, 200);
                    background-color: rgb(220, 220, 220)
                }
            
                #control-panel {
                    height: calc(100% - 3.7px);
                    width: 12%;
                    margin-top: -1.1px;
                    margin-right: 0px;
                    padding: 2px;
                    border-radius: 0px 0px 2.5px 0px;
                    background-color: rgb(220, 220, 220);
                    float: right
                }
            
                #control-panel-counters {
                    margin-right: -1px
                }
            
                .control-panel-button {
                    width: 3px;
                    height: 3px;
                    padding: 0.25px;
                    padding-top: 1.25px;
                    padding-bottom: 1.25px
                }
            
                .control-panel-counter {
                    text-align: center;
                    margin-bottom: 0.5px
                }
            
                #cycle-submission-count {
                    margin-top: 2px;
                    padding-bottom: 0.25px
                }
            
                #upvote-count {
                    padding-bottom: 0.25px
                }
                
                #downvote-count {
                    padding-bottom: 1px
                }

                #submission-text-container {
                    width: 37.5px;
                    margin-left: 1px
                }
                
                #submission-text-label {
                    margin-top: -2px
                }
                
                #submission-source-label {
                    margin-top: -1px
                }
                
                #submission-text, #submission-source {
                    margin-top: -2px;
                    border-radius: 4px
                }
                
                #submission-source {
                    margin-top: -2.5px
                }
            }
            
            @media screen and (max-resolution: 300dpi) {
                #tail {
                    margin-left: 45px;
                    border-left: 2.5px solid transparent;
                    border-right: 2.5px solid transparent;
                    border-bottom: 5px solid red
                }

                #view-submission-exit-button {
                    width: 4.4px;
                    height: 4.4px;
                    float: right;
                    margin-top: -7.5px;
                    margin-right: 2px
                }
            
                #completed-submission-container {
                    height: 62.5px;
                    width: 100px;
                    border-radius: 5px;
                    font-size: 4px;
                }
            
                #user-info-container {
                    height: 7%;
                    width: 100%;
                    margin-top: 20px;
                    border-radius: 5px 5px 0px 0px;
                    border-bottom: 0.5px solid rgb(200, 200, 200);
                    background-color: rgb(220, 220, 220)
                }
            
                #control-panel {
                    height: calc(100% - 5px);
                    width: 13%;
                    margin-top: -3.1px;
                    margin-right: 0px;
                    padding: 2px;
                    border-radius: 0px 0px 5px 0px;
                    background-color: rgb(220, 220, 220);
                    float: right
                }
            
                #control-panel-counters {
                    margin-right: 0px
                }
            
                .control-panel-button {
                    width: 6px;
                    height: 6px;
                    padding: 0.5px;
                    padding-top: 2.75px;
                    padding-bottom: 2.75px
                }
            
                .control-panel-counter {
                    text-align: center;
                    margin-bottom: 0px
                }
            
                #cycle-submission-count {
                    margin-top: 3px;
                    padding-bottom: 3px
                }
            
                #upvote-count {
                    padding-bottom: 2.5px
                }
                
                #downvote-count {
                    padding-bottom: 3px
                }

                #submission-text-container {
                    margin-left: 2px;
                    width: 77.5px
                }
                
                #submission-text-label, #submission-source-label {
                    margin-top: -2px
                }
                
                #submission-text, #submission-source {
                    margin-top: -3px;
                    border-radius: 2px
                }

                #submission-source {
                    margin-top: -4px
                }
            }
            
            @media screen and (max-resolution: 200dpi) {
                #tail {
                    margin-left: 102.5px;
                    border-left: 5px solid transparent;
                    border-right: 5px solid transparent;
                    border-bottom: 10px solid green
                }

                #view-submission-exit-button {
                    width: 9px;
                    height: 9px;
                    float: right;
                    margin-top: -20.5px;
                    margin-right: 2px
                }
            
                #completed-submission-container {
                    height: 150px;
                    width: 225px;
                    border-radius: 5px;
                    font-size: 0.7em
                }
            
                #user-info-container {
                    height: 7%;
                    width: 100%;
                    margin-top: 20px;
                    border-radius: 5px 5px 0px 0px;
                    border-bottom: 0.5px solid rgb(200, 200, 200);
                    background-color: rgb(220, 220, 220)
                }
            
                #control-panel {
                    height: calc(100% - 11.2px);
                    width: 17%;
                    margin-top: -10.7px;
                    margin-right: 0px;
                    padding: 2px;
                    border-radius: 0px 0px 5px 0px;
                    background-color: rgb(220, 220, 220);
                    float: right
                }
            
                .control-panel-button {
                    width: 16px;
                    height: 16px;
                    padding: 1px;
                    padding-top: 5.5px;
                    padding-bottom: 5.5px
                }
            
                #control-panel-counters {
                    margin-right: 2px
                }
            
                .control-panel-counter {
                    text-align: center;
                    margin-bottom: 8px
                }
            
                #cycle-submission-count {
                    margin-top: 6px;
                    padding-bottom: 0px
                }
            
                #upvote-count {
                    margin-top: 7px;
                    margin-bottom: 0px
                }
                
                #downvote-count {
                    margin-bottom: 3px;
                    padding-bottom: 0px
                }

                #submission-text-container {
                    margin-left: 5px;
                    width: 215px
                }
                
                #submission-text-label {
                    margin-bottom: 10px
                }
                
                #submission-source-label {
                    margin-top: -5px;
                    margin-bottom: 8.5px
                }
                
                #submission-text, #submission-source {
                    width: 170px;
                    margin-top: -6px;
                    border-radius: 4px
                }
            }
            
            @media screen and (max-resolution: 100dpi) {
                #tail {
                    margin-left: 180px;
                    border-left: 10px solid transparent;
                    border-right: 10px solid transparent;
                    border-bottom: 20px solid yellow
                }

                #view-submission-exit-button {
                    width: 15px;
                    height: 15px;
                    float: right;
                    margin-top: -30px;
                    margin-right: 2.5px
                }
            
                #completed-submission-container {
                    height: 250px;
                    width: 400px;
                    border-radius: 10px;
                    font-size: 1em
                }
            
                #user-info-container {
                    height: 7%;
                    width: 100%;
                    margin-top: 20px;
                    border-radius: 10px 10px 0px 0px;
                    border-bottom: 0.5px solid rgb(200, 200, 200);
                    background-color: rgb(220, 220, 220)
                }
            
                #control-panel {
                    height: calc(100% - 18.5px);
                    width: 17%;
                    margin-top: -13.5px;
                    margin-right: 0px;
                    padding: 2px;
                    border-radius: 0px 0px 10px 0px;
                    background-color: rgb(220, 220, 220);
                    float: right
                }
            
                .control-panel-button {
                    width: 35px;
                    height: 35px;
                    padding: 2px;
                    padding-top: 5.5px;
                    padding-bottom: 5.5px
                }
            
                #control-panel-counters {
                    margin-right: 4px;
                }
            
                .control-panel-counter {
                    text-align: center;
                    margin-bottom: 8px
                }
            
                #cycle-submission-count {
                    margin-top: 12px;
                    padding-bottom: 6px
                }
                
                #downvote-count {
                    padding-bottom: 5px
                }

                #submission-text-container {
                    margin-left: 5px;
                    width: 350px
                }
                
                #submission-text-label {
                    margin-bottom: 10px
                }
                
                #submission-source-label {
                    margin-bottom: 10px
                }
                
                #submission-text, #submission-source {
                    width: 315px;
                    border-radius: 5px
                }
            }

            #submission-text, #submission-source {
                background-color: white
            }
            
            #user-name-label, #karma-score-label {
                width: 50%;
                text-align: center;
                margin-top: 0px
            }
            
            #user-name-label {
                float: left
            }
            
            #karma-score-label {
                float: right
            }
            
            #control-panel-buttons, #control-panel-counters {
                display: inline-grid
            }
            
            #control-panel-buttons {
                float: left
            }
            
            #control-panel-counters {
                float: right
            }
            
            .control-panel-button:hover {
                background-color: rgb(200, 200, 200)
            }
        `;

        viewSubmissionShadowRoot.appendChild(shadowDomStyles);
        viewSubmissionShadowRoot.appendChild(container);
        isViewSubmissionDomCreated = true;

        //viewSubmissionShadowRoot.querySelector('');
        viewSubmissionContextMenuContainer = viewSubmissionShadowRoot.querySelector('#view-submission-context-menu-container');
        viewSubmissionInnerContainer = viewSubmissionShadowRoot.querySelector('#completed-submission-container');
        viewSubmissionText = viewSubmissionShadowRoot.querySelector('#submission-text');
        viewSubmissionSource = viewSubmissionShadowRoot.querySelector('#submission-source');
        viewSubmissionSourceContainer = viewSubmissionShadowRoot.querySelector('#submission-source-container');
        viewSubmissionExitButton = viewSubmissionShadowRoot.querySelector('#view-submission-exit-button');
        viewSubmissionExitButton.addEventListener('mouseover', exitButtonActive);
        viewSubmissionExitButton.addEventListener('click', exitContextMenu);
        tail = viewSubmissionShadowRoot.querySelector('#tail');
    }

    let thisAnnotationId = undefined;
    let thisSubmission = undefined;
    let isFinished = false;
    
    //fills in elements with the user submitted data
    let populateFields = function(object) {
        viewSubmissionText.innerText = object.submissionText;
        
        if (object.isSource) {
            viewSubmissionSourceContainer.classList.remove('hidden');
            
            let prettyLink = object.sourceLink.split('/')[2];
            viewSubmissionSource.innerText = prettyLink;
            viewSubmissionSource.href = object.sourceLink;
        }
        else {
            viewSubmissionSourceContainer.classList.add('hidden');
        }
    };

    setUiAtAnnotationPos(span);
    window.addEventListener("resize", function() {
        setUiAtAnnotationPos(span);
    });

    //finds the id associated with span passed as argument
    for (let i=0; i<span.classList.length; i++) {
        if (span.classList[i].substr(0, 3) == 'ANT') {
            thisAnnotationId = span.classList[i];
            break;
        }
    }

    //search in cache for submission if already fetched
    if (submissionCache.length > 0) {
        for (let i=0; i<submissionCache.length; i++) {
            if (submissionCache[i].assignedTo == thisAnnotationId) {
                thisSubmission = submissionCache[i];
                populateFields(thisSubmission);
                isFinished = true;
                break;
            }
        }
    }

    //if annotation assignedTo not found in cache, need to fetch from db 
    if (!isFinished) {
        //when functionality for multiple submissions at one annotation is added, this will break as it only fetches one
        chrome.runtime.sendMessage({
            request: 'read>submission>assignedTo',
            //quantity: 'one',
            subResource: thisAnnotationId
        }, 
        function(response) {
            console.log('fetching submission assigned to annotation with id: ', thisAnnotationId, 'data fetched: ', JSON.stringify(response.dataFetched, null, 4));
            console.log('response: ', response);

            thisSubmission = response.dataFetched;
            submissionCache.push(response.dataFetched);
            populateFields(response.dataFetched);

            viewSubmissionContextMenuContainer.classList.remove('hidden');
        }); 
    }

    viewSubmissionContextMenuContainer.classList.remove('hidden');

    //confirming submission link redirect
    viewSubmissionSource.addEventListener('click', function(event) {
        if (!window.confirm('Are you sure you want to redirect to the following link?\n' + thisSubmission.sourceLink + '\nThis link may redirect to a malicious site.')) {
            event.preventDefault();
        }
    });
}

//if a highlight-annotation span tag is nested within an anchor tag, there is uncertainty as to whether the user would like to follow the link or open the submission, this function confirms their choice
function confirmSpanClickedOrLink(element) { //element param unused now?

    //confirmation dialog box promise
    let confirmClickPromise = function(msg) {
        return new Promise(function(resolve, reject) {
            let confirmed = window.confirm(msg);
            
            return confirmed ? resolve(true) : reject(false);
        });
    };

    return new Promise(function(resolve, reject) {
        //callback so that that the eventlistener can still be removed (stops a bug from happening in which dialog box event isnt removed and it pops up each times per function call)
        let confirmationCallback = function(event) {
            anchorTag.removeEventListener('click', confirmationCallback);

            confirmClickPromise(
                'would you like to follow the link in the article? (if not click cancel and you can view the submission)'
                ).then(function() {
                    resolve();
                }).catch(function() {
                    event.preventDefault();
                    reject();
                });
        };

        //if (element.nodeName == 'SPAN' && foundAnnotationInAnchorTag(element)) {
            anchorTag.addEventListener('click', confirmationCallback);
        //}
    }); 
}

//finds anchor tag that nests parent element
function foundAnnotationInAnchorTag(span) {
    let parent = getParentElement(span);
    let isContainingAnchor = false;
    
    console.log('parent.children: ', parent.children);
    for (let i=0; i<parent.children.length; i++) {
        if (parent.children[i].nodeName == 'A') {
            let anchorInParent = parent.children[i];

            console.log('anchorInParent.children: ', anchorInParent.children);
            //searches for children of the anchor tag to see if this is the tag that nests the span (span with class highlight-annotation)
            for (let j=0; j<anchorInParent.children.length; j++) {
                if (anchorInParent.children[j].nodeName == 'SPAN' && anchorInParent.children[j].classList.contains('highlight-annotation') && anchorInParent.children[j] == span) {
                    anchorTag = anchorInParent;
                    isContainingAnchor = true;
                }

                //if (!isContainingAnchor && j == anchorInParent.children.length) {}
            }
        }
    }

    if (isContainingAnchor) {
        //open link in new tab
        anchorTag.target = '_blank';
        return true;
    }
    else {
        return false;
    }
}

//initialises various events to add functionality to span highlight elements
function initHighlightedElemEvents(elements) {
    console.log('element: ', elements);
    for (let i=0; i<elements.length; i++) {

        elements[i].addEventListener('click', function(event) {
            let currentAnnotationAtOpenSubmission = event.target;

            //promise is needed to ensure that the submission will only open if the user presses 'cancel' in confirm dialog (confirm is inherently async)
            if (foundAnnotationInAnchorTag(currentAnnotationAtOpenSubmission)) {
                console.log('is nested');
                confirmSpanClickedOrLink(currentAnnotationAtOpenSubmission).catch(function() {viewSubmission(currentAnnotationAtOpenSubmission)});
            }
            else {
                console.log('is not nested');
                viewSubmission(currentAnnotationAtOpenSubmission);
            }
        });

        //trigger mouseover feedback event for intial highlighted element but also all related elements to maintain the effect that the highlight is one united string
        elements[i].addEventListener('mouseover', function() {
            this.style.backgroundColor = 'rgb(235, 235, 235)';
            this.style.cursor = 'pointer';
            for (let j=0; j<elements.length; j++) {
                if (j != i) {
                    elements[j].style.backgroundColor = 'rgb(235, 235, 235)';
                    elements[j].style.cursor = 'pointer';
                }
            }
        });
    
        elements[i].addEventListener('mouseout', function() {
            this.style.backgroundColor = 'rgb(200, 200, 200)';
            for (let j=0; j<elements.length; j++) {
                if (j != i) {
                    elements[j].style.backgroundColor = 'rgb(200, 200, 200)';
                }
            }
        });
    }
}   

//inserts text (html tags) at the detected regions in the anchor and focus nodes, taken from https://stackoverflow.com/questions/4313841/insert-a-string-at-a-specific-index
function highlightAnnotation(object, element) {
    String.prototype.insertTextAtIndices = function(text) {
        return this.replace(/./g, function(character, index) {
            return text[index] ? text[index] + character : character;
        });
    };

    let highlighted = element.innerHTML.insertTextAtIndices(object);
    element.innerHTML = highlighted;
}

//finds an annotation in the parent document given a valid annotation object (fetched from database)
function findAnnotationInPage(object, type) {
    console.log('type: ', type);
    console.log('**************');

    //finds the boundary words in the anchor and focus node, ie: if the full text in the element is 'hello world! this is text' and the selection is 'this is text', then the start point is 13 charaters in and so forth
    let detectBoundaries = function(targetNode) {
        let startPoint = undefined;
        let endPoint = undefined;
        let searchString = undefined;
        let fullText = undefined;
        let temp = '';
        let indexInNodeChunks = undefined;
        let wholeText = targetNode.wholeText;
        let possibleMatches = [];
        let found = false;

        //must find outermost (parent) element in order to get the entirety of the text, this is because if the start and end points are attained from differing full texts, it will break the highlightAnnotation() function
        //this is because the insertions object is not reset per call of the findAnnotationInPage() function
        parentElemInDoc = getParentElement(findElement(type, targetNode))

        //getParentElement() gets the outermost block level element, however the highlight wont work if this isnt the element that contains the actual text
        if (parentElemInDoc.innerText == parentElemInDoc.firstChild.innerText) {
            parentElemInDoc = parentElemInDoc.firstChild;
        }
    
        //chunking up the element by its HTML tags and removing the split tags from the array
        nodeChunks = parentElemInDoc.innerHTML.split(/(<([^>]+)>)/g);
    
        for (let i=0; i<nodeChunks.length; i++) {
            if (nodeChunks[i].match(/(<([^>]+)>)/g, '') != null) {
                nodeChunks.splice(i, 2);
            }

            if (nodeChunks[i] == '') {
                nodeChunks.splice(i);
            }
        }

        console.log('search for indexInNodeChunks:');
        //anchor and focus nodes are not neccesarily the first and last nodes in the parent element found in doc
        for (let i=0; i<nodeChunks.length; i++) {
            console.log('nodeChunks[i]: ', nodeChunks[i], 'wholeText: ', wholeText);
            console.log('search: ', newSearch(nodeChunks[i], wholeText));

            if (newSearch(nodeChunks[i], wholeText) != 'failed') {
                indexInNodeChunks = i;
            }
        }


        console.log('nodeChunks: ', indexInNodeChunks, nodeChunks);
    
        //detects overlap of a given node chunk with the selection that was made, this is because if we simply searched in the node chunk for the whole text selected, it is likely that it would fail becuase it is only a chunk. 
        if (type == 'anchor' /*&& !object.isContainingChildren*/) {
            for (let i=nodeChunks[indexInNodeChunks].length-1; i>=0; i--) {
                temp = nodeChunks[indexInNodeChunks][i] + temp;
                searchString = object.textAnnotated.substr(0, temp.length);

                if (newSearch(temp, searchString) != 'failed') {

                    let j = 0;
                    let isAlreadyMatched = false;
                    do {
                        if (searchString == possibleMatches[i]) {
                            isAlreadyMatched = true;
                        }
                        
                        else {
                            if (j == possibleMatches.length) {
                                possibleMatches.push(searchString);
                                found = true;
                            }
                        }
                    }
                    while (j<possibleMatches.length && !isAlreadyMatched && !found);
                }
            }                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
        }
        else if (type == 'focus') {
            for (let i=0; i<nodeChunks[indexInNodeChunks].length; i++) {
                temp = temp + nodeChunks[indexInNodeChunks][i];
                searchString = object.textAnnotated.substr(object.textAnnotated.length - temp.length, temp.length);

                if (newSearch(temp, searchString) != 'failed') {
                    let j = 0;
                    let isAlreadyMatched = false;

                    do {
                        if (searchString == possibleMatches[i]) {
                           isAlreadyMatched = true;
                        }
                       
                        else {
                           if (j == possibleMatches.length) {
                               possibleMatches.push(searchString);
                               found = true;
                           }
                        }
                    }
                    while (j<possibleMatches.length && !isAlreadyMatched && !found);
                }
            }                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
        }

        if (!found) {
            console.log('detectBoundaries()| ERROR: could not detect boundary for type: ', type, 'at nodeChunk:',  indexInNodeChunks)
        }
        else {searchString = possibleMatches[possibleMatches.length-1]}
    

        //check for new bugs here due to changes made DEFO NEW BUGS HERE LMAO
        if (!object.isContainingChildren) {
            //does the searchString span over 2 nodes (html tags in innerHTML used to chunk into nodes will cause search to fail for any given chunk, therefore use innerText)
            //however just setting innerText declaratively causes it to break for other cases.
            if(newSearch(parentElemInDoc.innerHTML, searchString) == 'failed') {fullText = parentElemInDoc.innerText}
            else {fullText = parentElemInDoc.innerHTML}
        
            //does anchor/focus begin/end at the beginning/end of the node in question? if so need to use fulltext instead of wholeText
            if (indexInNodeChunks != 0 && indexInNodeChunks != nodeChunks.length-1 || newSearch(nodeChunks[indexInNodeChunks], searchString) != 'failed') {substringFrom = fullText}
            else {substringFrom = wholeText}       
        }
    
        //finds start point for the opening tag in the full text using searchString or object.textAnnotated, uses this start point to calculate the end point
        if (type == 'anchor' && !object.isContainingChildren) {
            console.log('fullText: ', fullText, 'searchString: ', searchString);
            startPoint = newSearch(fullText, searchString);
            endPoint = startPoint + searchString.length;
        }
        else if (type == 'anchor' && object.isContainingChildren) {
            console.log('wholeText: ', wholeText, 'object.textAnnotated: ', object.textAnnotated);
            startPoint = newSearch(wholeText, object.textAnnotated);
            endPoint = startPoint + object.textAnnotated.length;
        }
        else if (type == 'focus') {
            console.log('possibleMatches: ', possibleMatches);
            console.log('fullText: ', fullText, 'searchString: ', searchString);
            startPoint = newSearch(fullText, searchString);
            endPoint = startPoint + searchString.length;
        }
    
        console.log('points: ', startPoint, endPoint);
        console.log('**************')
    
        //uses start and end points as object keys with the values set as the <span> open and closing tags
        insertions[startPoint] = `<span class='` + object.annotationId + ` highlight-annotation' style='background-color: rgb(200, 200, 200)'>`;
        insertions[endPoint] = '</span>';
    };

    //highlighting elements inbetween anchor node and focus node
    let highlightMidNodes = function(object) {
        let startPoint = undefined;
        let endPoint = undefined;
        let anchorIndex = undefined;
        let focusIndex = undefined;

        //find index of middle nodes in node chunks
        for (let i=0; i<nodeChunks.length; i++) {
            if (object.anchor.wholeText == nodeChunks[i]) {
                anchorIndex = i;
            }
            else if (object.focus.wholeText == nodeChunks[i]) {
                focusIndex = i;
            }
        }

        for (let i=anchorIndex+1; i<focusIndex; i++) {
            let childElemInDoc = findElement(type, nodeChunks[i])

            startPoint = newSearch(parentElemInDoc.innerHTML, childElemInDoc.innerText);
            endPoint = startPoint + childElemInDoc.innerText.length;

            console.log('parentElemInDoc: ', parentElemInDoc.innerHTML);
            console.log('points at highlightMidNodes(): ', startPoint, endPoint);

            insertions[startPoint] = `<span class='` + object.annotationId + ` highlight-annotation' style='background-color: rgb(200, 200, 200)'>`;
            insertions[endPoint] = '</span>';
        }
    }

    //assigning the right arguments for the respective type specified at findInAnnotation()
    if (type == 'anchor') {
        detectBoundaries(object.anchor);
    }
    else if (type == 'middle') {
        highlightMidNodes(object);
    }
    else if (type == 'focus') {
        detectBoundaries(object.focus);
    }
    else {
        console.log('ERROR: invalid type: ', type);
        return;
    }
}

//publish button click function
function publishSubmission() {
    //sends preliminarily validated data to background script for more in depth validation
    let sendData = function(annotation, submission) {
        let resource = 'submission';
        submission.assignedTo = annotation.annotationId;

        let data = {
            submission: submission
        }

        if (annotation.annotationId != '') {
            data.annotation = annotation;
            resource = 'both';
        }

        chrome.runtime.sendMessage({
            request: 'create>validate', 
            resource: resource,
            data: data
        }, 
        function(response) {
            console.log('sent submission for validation, data received: ', JSON.stringify(response.dataReceived, null, 4));
        });

        findAnnotationInPage(annotation, 'anchor');

        //may cause bugs here
        if (!annotation.isUnified) {
            findAnnotationInPage(annotation, 'middle');
            findAnnotationInPage(annotation, 'focus');
        }

        console.log('insertions: ', JSON.stringify(insertions), 'parentElemInDoc: ', parentElemInDoc);
        highlightAnnotation(insertions, parentElemInDoc);
        
        parentElemInDoc = null;
        nodeChunks = null;
        insertions = {}

        location.reload();
    }

    //checks to see if url given is in correct format, taken from https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
    let validateUrlFormat = function(string) {
        let url;
      
        try {
            url = new URL(string);
        } 
        catch (_) {
            return false;  
        }
    
        return url.protocol === 'http:' || url.protocol === 'https:';
    }

    //validates if input is unchanged or whitespace and other data, then set values to the submission object
    if (submissionInput.value != '' && submissionInput.value.trim() != '' && submissionInput.value != emptyVal) {
        submission.submissionText = submissionInput.value;

        if (submission.isSource) {
            if (validateUrlFormat(sourceInput.value) != false) {
                submission.sourceLink = sourceInput.value;
                submission.submissionId = generateId('submission');
                sendData(annotation, submission);
            }
            else {alert('Enter a valid HTTP Link (http://, https://)')}
        }
        else {
            submission.sourceLink = null;
            submission.submissionId = generateId('submission');
            sendData(annotation, submission);
        }
    }
    else {alert('Enter a valid submission')}
}

function begunSelecting() {
    window.removeEventListener('mouseup', doneSelecting);

    //only need to run this set up code the first time a selection is made
    if (!isUserInputDomCreated) {

        //creating, styling and appending shadowDOM to document
        let hostElement = document.createElement('div');
        hostElement.id = 'user-input-host-element';
        $(hostElement).appendTo('body');

        let shadowHost = hostElement;
        userInputShadowRoot = shadowHost.attachShadow({mode: 'open'}); 
        
        let container = document.createElement('div');
        container.id = 'user-input-context-menu-container';
        container.className = 'hidden';
        
        /*
        chrome.runtime.sendMessage({
            request: 'fetch>file',
            url: chrome.runtime.getURL('create-submission-context-menu.html'),
            type: 'text/html'
        }, 
        function(response) {
            console.log('response: ', response);
            container.innerHTML = response.html;
            console.log(container);
        });
        */
        
        container.innerHTML = `
            <div id='loading'>
                <img id='loading-icon' class='hidden' src='` + chrome.runtime.getURL('images/loading.png') + `' alt='loading' height='35' width='35'>
            </div>
            <div id='char-count'>
                <p class='char-count-text'><span id='char-count-value' class='char-count-text'></span>/100</p>
            </div>
            <div id='selection-menu' class='hidden'>
                <div class='selection-menu-output'>
                    <p id='selection-quotes' class='selection-menu-text hidden quotes-font'>‘<span id='selection-made' class='selection-menu-text'></span>’<span><img id='user-input-exit-button' class='hidden' src='` + chrome.runtime.getURL('images/exit-button.png') + `' alt='exit' height='15' width='15'></span></p>
                </div>
                <br>
                <div id='radio-container'>
                    <div id='argument-nature-container' class='radio-headers'>Nature of argument
                        <br>
                        <input class='selection-menu-radios argument-nature-radios' type='radio' id='for-radio' name='argument-nature' value='for'>
                        <label class='selection-menu-labels' for='for'>For</label>
                        <br>
                        <input class='selection-menu-radios argument-nature-radios' type='radio' id='against-radio' name='argument-nature' value='against'>
                        <label class='selection-menu-labels' for='against'>Against</label>
                        <br>
                        <input class='selection-menu-radios argument-nature-radios' type='radio' id='other-radio' name='argument-nature' value='other'>
                        <label class='selection-menu-labels' for='other'>Other</label>
                        <br>
                    </div>
                    <br>
                    <div id='source-container' class='radio-headers'>Have a source?
                        <br>
                        <input class='selection-menu-radios source-radios' type='radio' id='yes-source-radio' name='source' value='yes'>
                        <label class='selection-menu-labels' for='yes'>Yes</label>
                        <br>
                        <input class='selection-menu-radios source-radios' type='radio' id='no-source-radio' name='source' value='no'>
                        <label class='selection-menu-labels' for='no'>No</label>
                        <br>
                        <button id='confirm-choices'>Confirm</button>
                    </div>
                </div>
                
                <div id='user-annotation-container' class='hidden'>
                    <textarea id='submission-input' name='user-annotation' rows='4'>Your thoughts</textarea>
                    <input type='text' id='source-input' name='source' value='Link'>
                    <br>
                    <input id='publish-annotation' type='submit' value='Publish'>
                </div>
            </div>`
        ;
        
        //src='` + chrome.runtime.getURL('images/loading.png') + `'

        let shadowDomStyles = document.createElement('style');
        shadowDomStyles.innerText = `
            #user-input-context-menu-container {
                position: fixed;
                height: 2%;
                width: 6.5%;
                background-color: rgba(230, 230, 230, 0.8);
                padding: 0px;
                border-radius: 2.5px 10px 10px 10px;
                z-index: 9999
            }
            #user-input-exit-button {
                float: right;
                margin-top: 4.5px;
                margin-right: 5px
            }
            #user-input-exit-button:hover {
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
            #user-annotation-container {
                margin-top: 0px;
            }
            
            #submission-input, #source-input {
                border: none;
                border-radius: 2.5px 20px 20px 20px;
                margin-top: 10px;
                margin-left: 15%;
                margin-right: 15%;
                width: 70%;
                resize: none
            }
            #submission-input:focus, #source-input:focus {
                outline: none;
            }
            #source-input {
                height: 25px
            }
            #publish-annotation {
                margin-left: 15%;
                margin-top: 20px
            }
            #char-count {
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

        userInputShadowRoot.appendChild(shadowDomStyles);
        userInputShadowRoot.appendChild(container);

        //saves repeating querySelector + more readability
        userInputContextMenuContainer = userInputShadowRoot.querySelector('#user-input-context-menu-container');
        charCountText = userInputShadowRoot.querySelector('.char-count-text');
        selectionMenu = userInputShadowRoot.querySelector('#selection-menu');
        selectionMade = userInputShadowRoot.querySelector('#selection-made');
        radioContainer = userInputShadowRoot.querySelector('#radio-container');
        radioHeaders = userInputShadowRoot.querySelectorAll('.radio-headers');
        userInputExitButton = userInputShadowRoot.querySelector('#user-input-exit-button');
        argumentNatureVals = userInputShadowRoot.querySelectorAll('.argument-nature-radios');
        sourceVals = userInputShadowRoot.querySelectorAll('.source-radios');
        annotationContainer = userInputShadowRoot.querySelector('#user-annotation-container');
        submissionInput = userInputShadowRoot.querySelector('#submission-input');
        sourceInput = userInputShadowRoot.querySelector('#source-input');

        userInputExitButton.addEventListener('click', exitContextMenu);
        userInputShadowRoot.querySelector('#confirm-choices').addEventListener('click', confirmChoices);
        userInputShadowRoot.querySelector('#publish-annotation').addEventListener('click', publishSubmission);

        emptyVal = submissionInput.value;

        console.log('userInputShadowRoot: ', userInputShadowRoot);
        console.log('document: ', document);
    }
    else {
        //if already clicked once, just need to hide/unhide elements rather than creating them every time
        whenNotHovering(userInputContextMenuContainer, function() {
            isFocussed = false;
            isAbortSelection = false;
            resetAnnotation();
            if (isExpanded) {
                styleShadowDom(userInputShadowRoot, [
                    '#selection-quotes',
                    '#user-input-exit-button', 
                    '#argument-nature-container', 
                    '#source-container'
                ], [['display', 'none']]);

                isExpanded = false;
                if (isConfirmed) {
                    if (!submission.isSource) {sourceInput.classList.remove('hidden');}
                    styleShadowDom(userInputShadowRoot, ['#user-annotation-container'], [['display', 'none']])
                }

                userInputContextMenuContainer.classList.remove('expand-anim');
                charCountText.classList.add('fadein-anim');
    
                setTimeout(function() {
                    charCountText.classList.remove('hidden');
                    charCountText.classList.remove('fadein-anim');
                }, 150);
            }
        });
    }

    isUserInputDomCreated = true;
    
    whenHovering(userInputContextMenuContainer, function() {
        isFocussed = true;
    });

    //checks to see whether mouse events lead to a selection being made or just normal click
    checkSelectMade = setInterval(function() {
        whenNotHovering(userInputContextMenuContainer, function() {
            let initialSelection = window.getSelection().toString();

            if (initialSelection.length > 0 && !isAbortSelection) {
                isSelectMade = true;
                userInputContextMenuContainer.classList.remove('hidden');
            }
            else {
                isSelectMade = false
            }
        })
    }, 50);

    //displays the current character count of selection being made
    updateCharCount = setInterval(function() {
        if (isSelectMade && !isFocussed && !isExpanded) {
            let countLimit = 100; 
            let rgb = '';
            selectionList = [];

            let thisSelection = autoCompSelection();
            charCount = thisSelection.length;
            
            userInputShadowRoot.querySelector('#char-count-value').innerText = charCount;

            if (charCount > countLimit) {
                rgb = 'rgba(255, 96, 96, 0.8)'
                isOverLimit = true;
            }
            else {
                rgb = 'rgba(230, 230, 230, 0.8)'
                isOverLimit = false;
            }

            styleShadowDom(userInputShadowRoot, '#user-input-context-menu-container', [['background-color', rgb]]);
            whenNotHovering(userInputContextMenuContainer, function() {
                window.addEventListener('mousemove', setToMousePos);
            });
        }
    }, 100);

    //allows user to 'click out' of context menu
    whenNotHovering(userInputContextMenuContainer, function() {
        styleShadowDom(userInputShadowRoot, '#user-input-context-menu-container', [
            ['left', event.clientX + 75 + 'px'],
            ['top', event.clientY + 50 + 'px'],
        ]);
    });
        
    window.addEventListener('keydown', function(event) {
        if (event.keyCode === 83) {window.addEventListener('mouseup', doneSelecting)}
    });

    window.addEventListener('keyup', function(event) {
        let isMouseUp = false;
        if (event.keyCode === 83) {
            if (!isExpanded) {
                //some delay added to check whether user meant to let mouse up but they let s key up first
                window.addEventListener('mouseup', function() {isMouseUp = true});

                setTimeout(function() {
                    //hide UI if s key is let up before mouse key
                    if (!isMouseUp) {
                        isAbortSelection = true;
                        userInputContextMenuContainer.classList.add('fadeout-anim');
            
                        setTimeout(function() {
                            userInputContextMenuContainer.classList.add('hidden');
                            userInputContextMenuContainer.classList.remove('fadeout-anim');
                        }, 150);
                    }
                    else {doneSelecting()}
                }, 300);
            }
            
            window.removeEventListener('mouseup', doneSelecting);
        }
    });
}

//selection callback function
function doneSelecting() {
    window.removeEventListener('mousemove', setToMousePos);
    window.removeEventListener('mousedown', begunSelecting);
    clearInterval(checkSelectMade);
    clearInterval(updateCharCount);

    //if selection more than 100 chars, then appropriate animation displayed
    if (isOverLimit) {
        userInputContextMenuContainer.classList.add('shake-anim');

        setTimeout(function() {
            userInputContextMenuContainer.classList.add('fadeout-anim')

            setTimeout(function() {
                userInputContextMenuContainer.classList.add('hidden');
                userInputContextMenuContainer.classList.remove('fadeout-anim');
                userInputContextMenuContainer.classList.remove('shake-anim');
                styleShadowDom(userInputShadowRoot, '#user-input-context-menu-container', [['background-color', 'rgb(230, 230, 230)']]);
            }, 150)
        }, 350)
    }
    else {
        if (isSelectMade) {
            let finalSelection = '';
            annotation.urlOfArticle = window.location.href;
            submission.urlOfArticle = window.location.href;

            whenNotHovering(userInputContextMenuContainer, function() {
                //triple clicks cause weird bugs
                //if (event.detail === 3) {userInputContextMenuContainer.classList.add('hidden')}

                if (!isFocussed) {
                    let selectionObj = window.getSelection();

                    finalSelection = autoCompSelection();
                    initAnnotation(selectionObj, finalSelection);
                }
            });
            
            styleShadowDom(userInputShadowRoot, '#user-input-context-menu-container', [['background-color', 'rgb(230, 230, 230)']]);
            charCountText.classList.add('fadeout-anim');
            userInputContextMenuContainer.classList.add('expand-anim');
            isExpanded = true;

            setTimeout(function() {
                charCountText.classList.add('hidden');
                charCountText.classList.remove('fadeout-anim');
                selectionMenu.classList.add('fadein-anim');
                userInputExitButton.classList.add('fadein-anim');

                setTimeout(function() {
                    whenNotHovering(userInputContextMenuContainer, function() {
                        if (!isFocussed) {
                            //displays first 50 chars of selection to save space
                            if (finalSelection.length > 50) {selectionMade.innerText = finalSelection.substr(0, 50) + '...';}
                            else {selectionMade.innerText = finalSelection}
                            radioContainer.classList.remove('hidden');

                            styleShadowDom(userInputShadowRoot, [
                                '#selection-quotes', 
                                '#user-input-exit-button', 
                                '#argument-nature-container', 
                                '#source-container'
                            ], 
                            [['display', 'inline']]);

                            userInputExitButton.addEventListener('mouseover', exitButtonActive);
                        }
                    });
                    selectionMenu.classList.remove('hidden');   
                }, 150)
            }, 150)
        }
        else {
            userInputContextMenuContainer.classList.add('hidden')
        }
    }

    selectionList = [];
    
    window.addEventListener('keydown', function(event) {
        if (event.keyCode === 83) {
            window.addEventListener('mousemove', borderHoveredElement);
            window.addEventListener('mousedown', begunSelecting)
        }
    });

    window.addEventListener('keyup', function(event) {
        if (event.keyCode === 83) {
            window.removeEventListener('mousemove', borderHoveredElement);
            window.removeEventListener('mousedown', begunSelecting)
        }
    });
}

//adds a temporary border to element currently being hovered over (while holding s key)
function borderHoveredElement() {
    let overElement = document.elementFromPoint(event.clientX, event.clientY);
    overElement = getParentElement(overElement);
    overElement.style = `
        border-style: solid;
        border-width: 1px;
        border-radius: 4px;
        border-color: rgb(200, 200, 200)
    `;

    overElement.addEventListener('mouseout', function() {
        overElement.style = `
            border: none
        `;
    });
}

//event listeners
chrome.runtime.onMessage.addListener(handleContentRequests);

window.addEventListener('load', function() {
    //custom font added parent document for use in shadowDOM
    parentDocStyle = document.createElement('style');
    parentDocStyle.innerText = `
        @font-face {
            font-family: 'Revalia';
            src: url(` + chrome.runtime.getURL('fonts/Revalia-Regular.ttf') + `) format('truetype');
        }

        .disable-anchors {
            pointer-events: none;
        }

        .re-enable-anchors {
            pointer-events: auto;
        }
    `;

    $(parentDocStyle).appendTo('body');

    window.addEventListener('keydown', function(event) {
        if (event.keyCode === 83) {
            window.addEventListener('mousemove', borderHoveredElement);
            window.addEventListener('mousedown', begunSelecting);
        }
    });

    window.addEventListener('keyup', function(event) {
        if (event.keyCode === 83) {
            window.removeEventListener('mousemove', borderHoveredElement);
            window.removeEventListener('mousedown', begunSelecting);
        }
    });

    /*
    chrome.runtime.sendMessage({
        request: 'delete',
        resource: 'Annotations', 
        id: 'ANT6stvn9695'
    },
    function(response) {
        console.log('deleting: ', JSON.stringify(response.dataFetched, null, 4));
    });
    */

    chrome.runtime.sendMessage({
        request: 'read',
        quantity: 'all',
        resource: 'Annotations', 
        subResource: window.location.href
    }, 
    function(response) {
        console.log('fetching submissions for page, data fetched: ', JSON.stringify(response.dataFetched, null, 4));

        if (response.dataFetched.length > 0) {
            for (let i=0; i<response.dataFetched.length; i++) {
                //console.log('prelim elem: ', getParentElement(findElement('anchor', response.dataFetched[i].anchor)));
                //console.log('isContainingChildren condition: ', getParentElement(findElement('anchor', response.dataFetched[i].anchor)).children);

                findAnnotationInPage(response.dataFetched[i], 'anchor');

                //may cause bugs here
                if (!response.dataFetched[i].isUnified) {
                    findAnnotationInPage(response.dataFetched[i], 'middle');
                    findAnnotationInPage(response.dataFetched[i], 'focus');
                }

                console.log('insertions: ', JSON.stringify(insertions), 'parentElemInDoc: ', parentElemInDoc);
                highlightAnnotation(insertions, parentElemInDoc);

                let highlightedElements = document.querySelectorAll('.' + response.dataFetched[i].annotationId);
                initHighlightedElemEvents(highlightedElements);
                
                parentElemInDoc = null;
                nodeChunks = null;
                insertions = {}
            }
        }

        //NEW TEST CASE TO DEBUG
        //console.log('also test: ', document.querySelectorAll('span.ANTn2i7skq8s.highlight-annotation'));
        //console.log('test: ', getParentElement(document.querySelectorAll('span.ANTn2i7skq8s.highlight-annotation')[1]));

        /*
        let selectedAnchorTags = document.querySelectorAll('a.highlight-annotation');
        console.log('selectedAnchorTags: ', selectedAnchorTags);

        //THIS CONFIRMCLICKPROMISE FUNCTION CALL MAY NOW BREAK
        for (let i=0; i<selectedAnchorTags.length; i++) {
            selectedAnchorTags[i].addEventListener('click', function(event) {
                anchorTag = selectedAnchorTags[i];
                confirmSpanClickedOrLink(event.target);
            });
        }
        */
        
    });
});