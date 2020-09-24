let selectionList = [];
let autoCompOutcome = '';
let emptyVal = ''
let validTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'UL', 'LI', 'A', 'STRONG', 'B', 'CITE', 'DFN', 'EM', 'I', 'KBD', 'LABEL', 'Q', 'SMALL', 'BIG', 'SUB', 'SUP', 'TIME', 'VAR'];
let insertions = {};
let nodeInDoc = undefined;
let nodeChunks = undefined

//user data objects
let annotation = {
    annotationId: '',
    textAnnotated: '',
    isUnified: true,
    anchor: {},
    focus: {},
    nodeList: [],
    submissionsMade: {}
}

let submission = {
    submissionId: '',
    assignedTo: '', 
    urlOfArticle: '',
    argumentNature: '',
    submissionText: '',
    isSource: false,
    sourceLink: undefined
}

//intervals
let checkSelectMade = undefined;
let updateCharCount = undefined;

//shadow DOM vars/elements
let shadowRoot = undefined;

let contextMenuContainer = undefined;
let charCountText = undefined;
let selectionMenu = undefined;
let selectionMade = undefined;
let radioContainer = undefined;
let radioHeaders = undefined;
let exitButton = undefined;
let argumentNatureVals = undefined;
let sourceVals = undefined;
let annotationContainer = undefined;
let submissionInput = undefined;
let sourceInput = undefined;

//bools
let isClicked = false;
let isSelectMade = false;
let isOverLimit = false;
let isExpanded = false;
let isConfirmed = false;
let isFocussed = false;

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

//recursive function to move up the tree of nodes starting from the selected node
function getParentNode(targetNode) {
    let parent = undefined;

    //recursion
    let getNextParent = function(child) {
        let isFinished = false;

        for (let i=0; i<validTags.length; i++) {
            if (child.parentNode.nodeName == validTags[i]) {
                parent = child.parentNode;
                getNextParent(parent);
                
                isFinished = true;
            }

            if (isFinished) {
                return
            }
            else if (!isFinished && i == validTags.length) {
                console.log('ERROR: tag not accepted');
            }
        }
    }

    getNextParent(targetNode);
    
    if (parent == undefined) {console.log('ERROR: conditions not met at getNextParent')}
    //console.log('parent: ', parent);
    return parent; 
}

//need to find the entirety of the text in nodes selected in order to calculate a start point carry out autocomplete function
function searchForContext(targetNode, selection) {
    let fullText = targetNode.wholeText;

    //if it couldnt be found then use parent
    if (newSearch(fullText, selection.trim()) == 'failed') {     
        fullText = getParentNode(targetNode).innerText;
    }

    let indexFound = newSearch(fullText, selection.trim());
    return [fullText, indexFound];
}

//is the furthest element in the tree where the anchor and focus nodes are both contained in a text element
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

//autocompletes the first and last words of the selection
function completeFirstWord(targetNode, selection) {
    let context = searchForContext(targetNode, selection);
    fullText = context[0];
    let startPoint = context[1];

    if (fullText.charAt(startPoint-1) != ' ' && startPoint != 0) {
        while (fullText.charAt(startPoint-1) != ' ' && startPoint > 0) {
            selection = fullText.charAt(startPoint-1).concat(selection);
            startPoint--;
        }
    }
    return selection;
}

function completeLastWord(targetNode, selection) {
    let context = searchForContext(targetNode, selection);
    fullText = context[0];
    let startPoint = context[1];
    let endPoint = startPoint + selection.length;

    if (fullText.charAt(endPoint) != ' ') {
        while (fullText.charAt(endPoint) != ' ' && endPoint < fullText.length) {
            selection = selection.concat(fullText.charAt(endPoint));
            endPoint++;
        }
    }

    return selection;
}

//pushes the nodes inbetween the anchor and focus to the selectionList array
function pushFilteredNodes(staticArray) {
    if (staticArray.length > 2) {
        for (let i=1; i<staticArray.length-1; i++) {
            selectionList.push(staticArray[i].innerText);
        }
    }
}

//filters out non block level tags
function filterSelectedNodes(liveList) {
    let staticArray = [];
    let blockTextTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'LI'];

    for (let i=0; i<liveList.length; i++) {
        for (let j=0; j<blockTextTags.length; j++) {
            if (liveList[i].tagName == blockTextTags[j]) {staticArray.push(liveList[i])}
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
    
    if (!thisSelectionObj.isCollapsed) {
        //if selection stays within the same node or not
        if (thisSelectionObj.anchorNode == thisSelectionObj.focusNode || testRange(thisSelectionObj.getRangeAt(0)) == true) {
            autoCompOutcome = completeFirstWord(thisSelectionObj.anchorNode, completeLastWord(thisSelectionObj.anchorNode, selection));
        }
        else if (thisSelectionObj.anchorNode != thisSelectionObj.focusNode) {
            let staticNodeArray = getAllNodes(thisSelectionObj);

            //if selection went up the page from starting point or down the page from starting point
            if (thisSelectionObj.anchorNode.wholeText.search(staticNodeArray[staticNodeArray.length-1].innerText) == -1) {
                selectionList.push(completeFirstWord(thisSelectionObj.anchorNode, staticNodeArray[0].innerText));
                pushFilteredNodes(staticNodeArray);
                selectionList.push(completeLastWord(thisSelectionObj.focusNode, staticNodeArray[staticNodeArray.length-1].innerText));
            }
            else {
                selectionList.push(completeFirstWord(thisSelectionObj.focusNode, staticNodeArray[0].innerText));
                pushFilteredNodes(staticNodeArray);
                selectionList.push(completeLastWord(thisSelectionObj.anchorNode, staticNodeArray[staticNodeArray.length-1].innerText));
            }  
            
            //concatenating text values of filtered selected elements
            autoCompOutcome = selectionList.join(' ');
            
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
    styleShadowDom(shadowRoot, '#context-menu-container', [
        ['left', event.clientX + 75 + 'px'],
        ['top', event.clientY + 50 + 'px']
    ]);
}

function exitButtonInactive() {
    exitButton.src = chrome.runtime.getURL('images/exit-button.png');
}

function exitButtonActive() {
    exitButton.src = chrome.runtime.getURL('images/exit-button-active.png');
    exitButton.addEventListener('mouseout', exitButtonInactive);
}

//exit button click function
function exitContextMenu() {
    contextMenuContainer.classList.add('hidden');
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

        let elemList = [shadowRoot.querySelectorAll('.selection-menu-radios'), shadowRoot.querySelectorAll('.selection-menu-labels')];
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

                styleShadowDom(shadowRoot, ['#user-annotation-container'], [['display', 'inline']]);
                annotationContainer.classList.remove('fadein-anim');
            }, 150)
        }, 550);
    }
    else {alert('You did not confirm all of your choices')}
}

//publish button click function
function publishSubmission() {
    //sends preliminarily validated data to background script for more in depth validation
    let sendData = function(annotation, submission) {
        submission.assignedTo = annotation.annotationId;
        annotation.submissionsMade[submission.submissionId] = submission;
        chrome.runtime.sendMessage({request: 'validate>submission', data: annotation}, function(response) {
            console.log('sent submission for validation, data received: ', JSON.stringify(response.dataReceived, null, 4));
        });

        findAnnotationInPage(annotation, 'anchor');

        if (!annotation.isUnified) {
            findAnnotationInPage(annotation, 'middle');
            findAnnotationInPage(annotation, 'focus');
        }

        console.log('insertions: ', insertions, 'nodeInDoc: ', nodeInDoc);
        highlightAnnotation(insertions, nodeInDoc);
        
        nodeInDoc = undefined;
        nodeChunks = undefined;
        insertions = {}
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

function resetAnnotation() {
    annotation = {
        annotationId: '',
        textAnnotated: '',
        isUnified: true,
        anchor: {},
        focus: {},
        nodeList: [],
        submissionsMade: {}
    }
}

//initialises the annotation object to begin setting values and sent to database
function initAnnotation(object, selection) {
    console.log('object in initAnnotation: ', object);
    annotation.textAnnotated = selection;

    annotation.anchor = {
        nodeName: object.anchorNode.nodeName,
        nodeType: object.anchorNode.nodeType,
        wholeText: object.anchorNode.wholeText,
        parentNode: null
    }

    if (object.anchorNode.parentNode.nodeName != 'BODY') {
        annotation.anchor.parentNode = {
            nodeName: object.anchorNode.parentNode.nodeName,
            nodeType: object.anchorNode.parentNode.nodeType,
            parentWholeText: object.anchorNode.parentNode.innerText
        }
    }

    //if selections spans multiple elements, then capture a snapshot of data for focus node to object
    if (object.anchorNode != object.focusNode) {
        annotation.isUnified = false;
        annotation.focus = {
            nodeName: object.focusNode.nodeName,
            nodeType: object.focusNode.nodeType,
            wholeText: object.focusNode.wholeText,
            parentNode: null
        }

        if (object.focusNode.parentNode.nodeName != 'BODY') {
            annotation.focus.parentNode = {
                nodeName: object.focusNode.parentNode.nodeName,
                nodeType: object.focusNode.parentNode.nodeType,
                parentWholeText: object.focusNode.parentNode.innerText
            }
        }
    }
    else {delete annotation.focus}

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

    annotation.annotationId = generateId('annotation');
}

//inserts text (html tags) at the detected regions in the anchor and focus nodes, taken from https://stackoverflow.com/questions/4313841/insert-a-string-at-a-specific-index
function highlightAnnotation(object, node) {
    String.prototype.insertTextAtIndices = function(text) {
        return this.replace(/./g, function(character, index) {
            return text[index] ? text[index] + character : character;
        });
    };

    let highlighted = node.innerHTML.insertTextAtIndices(object);
    node.innerHTML = highlighted;
}

//finds an annotation in the parent document given a valid annotation object (fetched from database)
function findAnnotationInPage(object, type) {
    console.log('type: ', type);
    console.log('**************');

    //finds the nodes in the parent docoument using the snapshots of data in the annotation object (cant call methods on the annotation object data as it is just strings and arrays etc not actual nodes)
    let findNode = function(targetNode) {
        let searchArea = [];
        let found = false;

        //if finding the anchor and focus nodes in document, use annotation data to find node, if finding middle nodes, use the nodeInDoc value that was found from the previous findNode() call in findAnnotation(object, 'anchor')
        if (type != 'middle') {
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
                console.log('findNode()| ERROR: could not find annotation: ', object.textAnnotated)
                return;
            }
        }
        else {
            //(previous nodeInDoc value)
            console.log('findNode| nodeInDoc.children: ', nodeInDoc.children);
            for (let i=0; i<nodeInDoc.children.length; i++) {
                if (nodeInDoc.children[i].innerText == targetNode) {
                    return nodeInDoc.children[i];
                }
            }
        }
    }

    //finds the boundary words in the anchor and focus node, ie: if the full text in the node is 'hello world! this is text' and the selection is 'this is text', then the start point is 13 charaters in and so forth
    let detectBoundaries = function(node) {
        let startPoint = undefined;
        let endPoint = undefined;
        let searchString = undefined;
        let fullText = undefined;
        let temp = '';
        let indexInNodeChunks = undefined;
        let wholeText = node.wholeText;

        nodeInDoc = findNode(node);

        //must find outermost (parent) node in order to get the entirety of the text, this is because if the start and end points are attained from differing full texts, it will break the highlightAnnotation() function
        //this is because the insertions object is not reset per call of the findAnnotationInPage() function
        for (let i=0; i<validTags.length; i++) {
            if (nodeInDoc.parentNode.nodeName == validTags[i]) {
                nodeInDoc = getParentNode(findNode(node))
                break;
            }
        }
            
        console.log('nodeInDoc: ', nodeInDoc);
    
        //chunking up the node by its HTML tags and removing the split tags from the array
        nodeChunks = nodeInDoc.innerHTML.split(/(<([^>]+)>)/g);
    
        for (let i=0; i<nodeChunks.length; i++) {
            if (nodeChunks[i].match(/(<([^>]+)>)/g, '') != null) {
                nodeChunks.splice(i, 2);
            }

            if (nodeChunks[i] == '') {
                nodeChunks.splice(i);
            }
        }

        console.log('node.wholeText: ', node.wholeText, 'nodeChunks ', nodeChunks);

        //anchor and focus nodes are not neccesarily the first and last nodes in the parent node found in doc
        for (let i=0; i<nodeChunks.length; i++) {
            if (node.wholeText == nodeChunks[i]) {indexInNodeChunks = i}
        }
    
        //detects overlap of a given node chunk with the selection that was made, this is because if we simply searched in the node chunk for the whole text selected, it is likely that it would fail becuase it is only a chunk. 
        if (type == 'anchor' && !object.isUnified) {
            let found = false;
            for (let i=nodeChunks[indexInNodeChunks].length-1; i>=0; i--) {
                temp = nodeChunks[indexInNodeChunks][i] + temp;
                searchString = object.textAnnotated.substr(0, temp.length);
                console.log('anchor|', 'temp: ', temp, 'searchString: ', searchString);
        
                if (temp == searchString) {
                    found = true;
                    break;
                }
            }                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
            
            if (!found) {
                console.log('detectBoundaries()| ERROR: could not find annotation: ', object.textAnnotated)
            }
        }
        else if (type == 'focus') {
            let found = false;
            for (let j=0; j<nodeChunks[indexInNodeChunks].length; j++) {
                temp = temp + nodeChunks[indexInNodeChunks][j];
                searchString = object.textAnnotated.substr(object.textAnnotated.length - temp.length, temp.length);
                console.log('focus|', 'temp: ', temp, 'searchString: ', searchString);
            
                if (temp == searchString) {
                    found = true;
                    break;
                }
            }                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
            
            if (!found) {
                console.log('detectBoundaries()| ERROR: could not find annotation: ', object.textAnnotated)
            }
        }
    
        console.log('searchString: ', searchString);
    
        if (!object.isUnified) {
            //does the searchString span over 2 nodes (html tag between these nodes will cause search to fail, therefore use innerText) however just setting innerText declaratively causes it to break for other cases.
            if (newSearch(nodeInDoc.innerHTML, searchString) == 'failed') {fullText = nodeInDoc.innerText}
            else {fullText = nodeInDoc.innerHTML}
        
            //does anchor/focus begin/end at the beginning/end of the node in question? if so need to use fulltext instead of wholeText because the fulltext is used for selections that start within a child node and end in the parent.
            console.log('indexInNodeChunks: ', indexInNodeChunks, 'nodeChunks.length: ', nodeChunks.length);
            if (indexInNodeChunks != 0 && indexInNodeChunks != nodeChunks.length-1) {substringFrom = fullText}
            else {substringFrom = wholeText}
        }
    
        //finds start point for the opening tag in the full text using searchString or object.textAnnotated, uses this start point to calculate the end point
        if (type == 'anchor' && !object.isUnified) {
            console.log('fullText: ', fullText, 'searchString', searchString);
            startPoint = newSearch(fullText, searchString);
            endPoint = startPoint + substringFrom.substr(startPoint).length;
        }
        else if (type == 'anchor' && object.isUnified) {
            console.log('wholeText: ', wholeText, 'object.textAnnotated: ', object.textAnnotated);
            startPoint = newSearch(wholeText, object.textAnnotated);
            endPoint = startPoint + object.textAnnotated.length + 1;
        }
        else if (type == 'focus') {
            console.log('fullText: ', fullText, 'searchString', searchString);
            startPoint = newSearch(fullText, searchString);
            endPoint = startPoint + searchString.length;
        }
    
        console.log('points: ', startPoint, endPoint);
        console.log('**************')
    
        //uses start and end points as object keys with the values set as the <span> open and closing tags
        insertions[startPoint] = `<span class='` + object.annotationId + ` highlight-annotation' style='background-color: rgb(200, 200, 200)'>`;
        insertions[endPoint] = '</span>';
    };

    //if highlighting middle nodes, dont need to find any boundaries, just highlight the whole element
    let highlightMidNodes = function(object) {
        let anchorIndex = undefined;
        let focusIndex = undefined;
        for (let i=0; i<nodeChunks.length; i++) {
            if (object.anchor.wholeText == nodeChunks[i]) {
                anchorIndex = i;
            }
            else if (object.focus.wholeText == nodeChunks[i]) {
                focusIndex = i;
            }
        }

        console.log('indexes: ', anchorIndex, focusIndex);

        for (let i=anchorIndex+1; i<focusIndex; i++) {
            let childNodeInDoc = findNode(nodeChunks[i]);
            childNodeInDoc.classList.add(object.annotationId, 'highlight-annotation');
            childNodeInDoc.style.backgroundColor = 'rgb(200, 200, 200)';
            console.log('childNodeInDoc.classList: ', childNodeInDoc.classList);

            console.log('middle loop| nodeChunks[i]', nodeChunks[i]); 
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

function begunSelecting() {
    window.removeEventListener('mouseup', doneSelecting);

    //only need to run this set up code the first time a selection is made
    if (!isClicked) {

        //creating, styling and appending shadowDOM to document
        let hostElement = document.createElement('div');
        hostElement.id = 'host-element'
        $(hostElement).appendTo('body');

        let shadowHost = hostElement;
        shadowRoot = shadowHost.attachShadow({mode: 'open'});
        
        let container = document.createElement('div');
        container.id = 'context-menu-container';
        container.className = 'hidden';
        container.innerHTML = `
            <div id='loading'>
                <img id='loading-icon' class='hidden' src='` + chrome.runtime.getURL('images/loading.png') + `' alt='loading' height='35' width='35'>
            </div>
            <div id='char-count'>
                <p class='char-count-text'><span id='char-count-value' class='char-count-text'></span>/100</p>
            </div>
            <div id='selection-menu' class='hidden'>
                <div class='selection-menu-output'>
                    <p id='selection-quotes' class='selection-menu-text hidden quotes-font'>‘<span id='selection-made' class='selection-menu-text'></span>’<span><img id='exit-button' class='hidden' src='` + chrome.runtime.getURL('images/exit-button.png') + `' alt='exit' height='15' width='15'></span></p>
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

        let shadowDomStyles = document.createElement('style');
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

        shadowRoot.appendChild(shadowDomStyles);
        shadowRoot.appendChild(container);

        //saves repeating querySelector + more readability
        contextMenuContainer = shadowRoot.querySelector('#context-menu-container');
        charCountText = shadowRoot.querySelector('.char-count-text');
        selectionMenu = shadowRoot.querySelector('#selection-menu');
        selectionMade = shadowRoot.querySelector('#selection-made');
        radioContainer = shadowRoot.querySelector('#radio-container');
        radioHeaders = shadowRoot.querySelectorAll('.radio-headers');
        exitButton = shadowRoot.querySelector('#exit-button');
        argumentNatureVals = shadowRoot.querySelectorAll('.argument-nature-radios');
        sourceVals = shadowRoot.querySelectorAll('.source-radios');
        annotationContainer = shadowRoot.querySelector('#user-annotation-container');
        submissionInput = shadowRoot.querySelector('#submission-input');
        sourceInput = shadowRoot.querySelector('#source-input');

        exitButton.addEventListener('click', exitContextMenu);
        shadowRoot.querySelector('#confirm-choices').addEventListener('click', confirmChoices);
        shadowRoot.querySelector('#publish-annotation').addEventListener('click', publishSubmission);

        emptyVal = submissionInput.value;

        console.log('shadowRoot: ', shadowRoot);
        console.log('document: ', document);
    }
    else {
        //if already clicked once, just need to hide/unhide elements rather than creating them every time
        whenNotHovering(contextMenuContainer, function() {
            isFocussed = false;
            resetAnnotation();
            if (isExpanded) {
                styleShadowDom(shadowRoot, ['#selection-quotes', '#exit-button', '#argument-nature-container', '#source-container'], [['display', 'none']]);    
                if (isConfirmed) {
                    if (!submission.isSource) {sourceInput.classList.remove('hidden');}
                    styleShadowDom(shadowRoot, ['#user-annotation-container'], [['display', 'none']])
                }

                contextMenuContainer.classList.remove('expand-anim');
                charCountText.classList.add('fadein-anim');
    
                setTimeout(function() {
                    charCountText.classList.remove('hidden');
                    charCountText.classList.remove('fadein-anim');
                }, 150);
            }
        });
    }
    
    whenHovering(contextMenuContainer, function() {
        isFocussed = true;
    });

    //checks to see whether mouse events lead to a selection being made or just normal click
    checkSelectMade = setInterval(function() {
        whenNotHovering(contextMenuContainer, function() {
            let initialSelection = window.getSelection().toString();

            if (initialSelection.length > 0) {
                isSelectMade = true;
                contextMenuContainer.classList.remove('hidden');
            }
            else {
                isSelectMade = false
            }
        })
    }, 50);

    //displays the this character count of selection being made
    updateCharCount = setInterval(function() {
        if (isSelectMade) {
            let countLimit = 100; 
            let rgb = '';
            selectionList = [];

            let thisSelection = autoCompSelection();
            charCount = thisSelection.length;
            
            shadowRoot.querySelector('#char-count-value').innerText = charCount;

            if (charCount > countLimit) {
                rgb = 'rgba(255, 96, 96, 0.8)'
                isOverLimit = true;
            }
            else {
                rgb = 'rgba(230, 230, 230, 0.8)'
                isOverLimit = false;
            }

            styleShadowDom(shadowRoot, '#context-menu-container', [['background-color', rgb]]);
            whenNotHovering(contextMenuContainer, function() {
                if (!isFocussed) {
                    window.addEventListener('mousemove', setToMousePos)
                }
            });
        }
    }, 100);

    //allows user to 'click out' of context menu
    whenNotHovering(contextMenuContainer, function() {
        styleShadowDom(shadowRoot, '#context-menu-container', [
            ['left', event.clientX + 75 + 'px'],
            ['top', event.clientY + 50 + 'px'],
        ]);
    })
        
    isClicked = true;
    window.addEventListener('keydown', function(event) {if (event.keyCode === 83) {
        window.addEventListener('mouseup', doneSelecting)
        console.log('success');
    }});
    window.addEventListener('keyup', function(event) {if (event.keyCode === 83) {window.removeEventListener('mouseup', doneSelecting);}});
}

//selection callback function
function doneSelecting() {
    window.removeEventListener('mousemove', setToMousePos);
    window.removeEventListener('mousedown', begunSelecting);
    clearInterval(checkSelectMade);
    clearInterval(updateCharCount);

    //if selection more than 100 chars, then appropriate animation displayed
    if (isOverLimit) {
        contextMenuContainer.classList.add('shake-anim');

        setTimeout(function() {
            contextMenuContainer.classList.add('fadeout-anim')

            setTimeout(function() {
                contextMenuContainer.classList.add('hidden');
                contextMenuContainer.classList.remove('fadeout-anim');
                contextMenuContainer.classList.remove('shake-anim');
                styleShadowDom(shadowRoot, '#context-menu-container', [['background-color', 'rgb(230, 230, 230)']]);
            }, 150)
        }, 350)
    }
    else {
        if (isSelectMade) {
            let finalSelection = '';
            submission.urlOfArticle = window.location.href;

            whenNotHovering(contextMenuContainer, function() {
                //triple clicks cause weird bugs
                if (event.detail === 3) {contextMenuContainer.classList.add('hidden')}

                if (!isFocussed) {
                    let selectionObj = window.getSelection();
                    console.log('selectionObj: ', selectionObj);

                    finalSelection = autoCompOutcome;
                    initAnnotation(selectionObj, finalSelection);
                }
            });
            
            styleShadowDom(shadowRoot, '#context-menu-container', [['background-color', 'rgb(230, 230, 230)']]);
            charCountText.classList.add('fadeout-anim');
            contextMenuContainer.classList.add('expand-anim');

            setTimeout(function() {
                charCountText.classList.add('hidden');
                charCountText.classList.remove('fadeout-anim');
                selectionMenu.classList.add('fadein-anim');
                exitButton.classList.add('fadein-anim');
                isExpanded = true;

                setTimeout(function() {
                    whenNotHovering(contextMenuContainer, function() {
                        if (!isFocussed) {
                            //displays first 50 chars of selection to save space
                            if (finalSelection.length > 50) {selectionMade.innerText = finalSelection.substr(0, 50) + '...';}
                            else {selectionMade.innerText = finalSelection}
                            radioContainer.classList.remove('hidden');
                            styleShadowDom(shadowRoot, ['#selection-quotes', '#exit-button', '#argument-nature-container', '#source-container'], [['display', 'inline']]);
                            exitButton.addEventListener('mouseover', exitButtonActive);
                        }
                    });
                    selectionMenu.classList.remove('hidden');   
                }, 150)
            }, 150)
        }
        else {
            contextMenuContainer.classList.add('hidden')
        }
    }

    selectionList = [];
    autoCompOutcome = '';
    
    window.addEventListener('keydown', function(event) {if (event.keyCode === 83) {window.addEventListener('mousedown', begunSelecting)}});
    window.addEventListener('keyup', function(event) {if (event.keyCode === 83) {window.removeEventListener('mousedown', begunSelecting)}});
}

//event listeners
chrome.runtime.onMessage.addListener(handleContentRequests);

window.addEventListener('load', function() {
    //custom font added parent document for use in shadowDOM
    let fontRule = document.createElement('style');
    fontRule.innerText = `
        @font-face {
            font-family: 'Revalia';
            src: url(` + chrome.runtime.getURL('fonts/Revalia-Regular.ttf') + `) format('truetype');
        }
    `;

    $(fontRule).appendTo('body');
    //window.addEventListener('mousedown', begunSelecting);

    window.addEventListener('keydown', function(event) {if (event.keyCode === 83) {window.addEventListener('mousedown', begunSelecting)}});
    window.addEventListener('keyup', function(event) {if (event.keyCode === 83) {window.removeEventListener('mousedown', begunSelecting)}});

    let testData = {
        "annotationId": "ANTrx95y3504",
        "textAnnotated": "government's testing system - part of its test, track and trace operation",
        "isUnified": true,
        "anchor": {
            "nodeName": "#text",
            "nodeType": 3,
            "wholeText": "The government's testing system - part of its test, track and trace operation which Prime Minister Boris Johnson ",
            "parentNode": {
                "nodeName": "P",
                "nodeType": 1,
                "parentWholeText": "The government's testing system - part of its test, track and trace operation which Prime Minister Boris Johnson promised would be \"world-beating\" - has faced criticism in recent weeks."
            }
        },
        "submissionsMade": {
            "SUB57qm416ha": {
                "submissionId": "SUB57qm416ha",
                "assignedTo": "ANTrx95y3504",
                "urlOfArticle": "https://www.bbc.co.uk/news/uk-54156889",
                "argumentNature": "for",
                "submissionText": "Your trehoughts",
                "isSource": false,
                "sourceLink": null
            }
        }
    };
    
    //sequence of function calls to find an annotation in the parent document given a specific annotation object (fetched from database)
    findAnnotationInPage(testData, 'anchor');

    if (!testData.isUnified) {
        findAnnotationInPage(testData, 'middle');
        findAnnotationInPage(testData, 'focus');
    }

    console.log('insertions: ', insertions, 'nodeInDoc: ', nodeInDoc);
    highlightAnnotation(insertions, nodeInDoc);
        
    nodeInDoc = undefined;
    nodeChunks = undefined;
    insertions = {}
});