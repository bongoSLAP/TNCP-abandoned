let selectionList = [];
let autoCompOutcome = '';
let emptyVal = ''
let validTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'UL', 'LI', 'A', 'STRONG', 'B', 'CITE', 'DFN', 'EM', 'I', 'KBD', 'LABEL', 'Q', 'SMALL', 'BIG', 'SUB', 'SUP', 'TIME', 'VAR'];

//need to assign these values.
let anotation = {
    anotationId: '',
    textAnotated: '',
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

//shadow DOM elements
let checkSelectMade = undefined;
let updateCharCount = undefined;
let contextMenuContainer = undefined;
let loadingIcon = undefined;
let charCountContainer = undefined;
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
let submissionInput = undefined;
let sourceInput = undefined;
let publishButton = undefined;

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

    if (type == 'anotation') {
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
    //may find bugs here in future
    let regExp = new RegExp(sanitiseRegExp(query.trim()));
    let searchOutcome = searchIn.search(regExp);

    if (searchOutcome == -1) {
        return 'failed';
    }
    else {return searchOutcome}
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
                    if (child.parentNode.nodeName == '#text') {
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
                    console.log('ERROR: tag not accepted');
                }
            }
        }

        getNextParent(targetNode);
        
        if (newWholeText == undefined) {console.log('ERROR: conditions not met at getNextParent')}
        return newWholeText; 
    }

    //if it couldnt be found then move up a layer and repeat
    if (newSearch(fullText, selection) == 'failed') {     
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

function pushFilteredNodes(staticArray) {
    if (staticArray.length > 2) {
        for (let i=1; i<staticArray.length-1; i++) {
            selectionList.push(staticArray[i].innerText);
        }
    }
}

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

function getAllNodes(object) {
    let liveNodeList = object.getRangeAt(0).cloneContents().querySelectorAll('*');
    return filterSelectedNodes(liveNodeList);
}

function autoCompSelection() {
    let thisSelectionObj = window.getSelection();
    let selection = thisSelectionObj.toString();
    
    if (!thisSelectionObj.isCollapsed) {
        //if selection stays within the same node
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
            
            //console.log('selectionList: ', selectionList);
            //console.log('staticNodeArray: ', staticNodeArray);
        }           
    }
    return autoCompOutcome;
}

//function for easily applying multiple styles to shadowDOM
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

function exitContextMenu() {
    contextMenuContainer.classList.add('hidden');
}

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

        let elemList = [radioButtons, radioLabels];
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

            anotationContainer.classList.add('fadein-anim');

            setTimeout(function() {
                if (!submission.isSource) {sourceInput.classList.add('hidden');}

                styleShadowDom(shadowRoot, ['#user-anotation-container'], [['display', 'inline']]);
                anotationContainer.classList.remove('fadein-anim');
            }, 150)
        }, 550);
    }
    else {alert('You did not confirm all of your choices')}
}

function publishSubmission() {
    //sends preliminarily validated data to background script for more in depth validation
    let sendData = function(anotation, submission) {
        submission.assignedTo = anotation.anotationId;
        anotation.submissionsMade[submission.submissionId] = submission;
        chrome.runtime.sendMessage({request: 'validate>submission', data: anotation}, function(response) {
            console.log('sent submission for validation, data received: ', JSON.stringify(response.dataReceived, null, 4));
        });

        findAnotationInPage(anotation, 'anchor');

        if (!anotation.isUnified) {
            if ('nodeList' in anotation) {
                if(anotation.nodeList.length > 2) {findAnotationInPage(anotation, 'middle')}
            }
            findAnotationInPage(anotation, 'focus');
        }
    }

    //checks to see if url given is in correct format
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

    //if not empty or whitespace
    if (submissionInput.value != '' && submissionInput.value.trim() != '' && submissionInput.value != emptyVal) {
        submission.submissionText = submissionInput.value;

        if (submission.isSource) {
            if (validateUrlFormat(sourceInput.value) != false) {
                submission.sourceLink = sourceInput.value;
                submission.submissionId = generateId('submission');
                console.log('this in publish: ', anotation);
                sendData(anotation, submission);
            }
            else {alert('Enter a valid HTTP Link (http://, https://)')}
        }
        else {
            submission.sourceLink = null;
            submission.submissionId = generateId('submission');
            console.log('this in publish: ', anotation);
            sendData(anotation, submission);
        }
    }
    else {alert('Enter a valid submission')}
}

function resetAnotation() {
    anotation = {
        anotationId: '',
        textAnotated: '',
        isUnified: true,
        anchor: {},
        focus: {},
        nodeList: [],
        submissionsMade: {}
    }
}

function initAnotation(object, selection) {
    console.log('object in initAnotation: ', object);
    anotation.textAnotated = selection;
    anotation.anchor = {
        nodeName: object.anchorNode.nodeName,
        nodeType: object.anchorNode.nodeType,
        wholeText: object.anchorNode.wholeText,
        parentNode: null
    }

    if (object.anchorNode.parentNode.nodeName != 'BODY') {
        anotation.anchor.parentNode = {
            nodeName: object.anchorNode.parentNode.nodeName,
            nodeType: object.anchorNode.parentNode.nodeType,
            parentWholeText: object.anchorNode.parentNode.innerText
        }
    }

    if (object.anchorNode != object.focusNode) {
        anotation.isUnified = false;
        anotation.focus = {
            nodeName: object.focusNode.nodeName,
            nodeType: object.focusNode.nodeType,
            wholeText: object.focusNode.wholeText,
            parentNode: null
        }

        if (object.focusNode.parentNode.nodeName != 'BODY') {
            anotation.focus.parentNode = {
                nodeName: object.focusNode.parentNode.nodeName,
                nodeType: object.focusNode.parentNode.nodeType,
                parentWholeText: object.focusNode.parentNode.innerText
            }
        }
    }
    else {delete anotation.focus}

    let nodeList = getAllNodes(object);
    console.log('nodeList: ', nodeList);

    if (nodeList.length != 0) {
        for (let i=0; i<nodeList.length; i++) {
            let node = {
                nodeName: nodeList[i].nodeName,
                nodeType: nodeList[i].nodeType,
                wholeText: nodeList[i].innerText
            }

            anotation.nodeList.push(node);
        }
    }
    else {delete anotation.nodeList}

    anotation.anotationId = generateId('anotation');
}

function findAnotationInPage(object, type) {
    let wordList = object.textAnotated.split(' ');
    let wholeText = undefined;
    
    console.log('type: ', type);

    let findNode = function(targetNode) {
        let searchArea = [];
        let found = false;
        if (targetNode.nodeType != 1) {
            searchArea = document.querySelectorAll(targetNode.parentNode.nodeName.toLowerCase());
        }
        else {
            searchArea = document.querySelectorAll(targetNode.nodeName.toLowerCase());
        }

        wholeText = targetNode.wholeText;
        console.log('wholeText: ', wholeText);

        for (let i=0; i<searchArea.length; i++) {
            //if (newSearch(searchArea[i].innerText, wholeText) != 'failed') {
            if (searchArea[i].innerText == targetNode.parentNode.parentWholeText) {
                found = true;
                return searchArea[i];
            }
        }

        if (!found) {
            console.log('ERROR: could not find anotation: ', object.textAnotated)
            return;
        }
    }

    //inserts strings into a target string at multiple different places.
    String.prototype.insertTextAtIndices = function(text) {
        return this.replace(/./g, function(character, index) {
            return text[index] ? text[index] + character : character;
        });
    };

    let countDuplicates = function(keyword) {
        let regexp = new RegExp(keyword, 'g');
        let count = (wholeText.match(regexp) || []).length;

        if (count > 0) {
            return count;
        } 
        else {
            console.log(keyword + 'not found in' + wholeText);
            return false;
        }
    }

    let highlightAnotation = function(node) {
        let nodeInDoc = findNode(node)
        let startPoint = undefined;
        let endPoint = undefined;
        let insertions = {};

        console.log('nodeInDoc: ', nodeInDoc);

        test = nodeInDoc.innerHTML.split(/(<([^>]+)>)/g);

        for (let i=0; i<test.length; i++) {
            if(test[i].match(/(<([^>]+)>)/g, '') != null) {
                test.splice(i, 2);
            }
        }

        console.log(test);
        

        if (type == 'anchor' && !object.isUnified) {
            console.log("wholeText: ", wholeText, "test[0]", test[0]);
            startPoint = newSearch(wholeText, test[0]);
            endPoint = startPoint + wholeText.substr(startPoint).length;
        }
        else if (type == 'anchor' && object.isUnified) {
            startPoint = newSearch(wholeText, object.textAnotated);
            endPoint = startPoint + object.textAnotated.length
        }
        else if (type == 'focus') {
            console.log("wholeText: ", wholeText, "test[test.length-1]", test[test.length-1]);
            startPoint = 0;
            endPoint = newSearch(wholeText, test[test.length-1]) + test[test.length-1].length;
        }

        console.log('points: ', startPoint, endPoint);

        insertions[startPoint] = `<span class='` + object.anotationId + ` highlight-anotation' style='background-color: rgb(200, 200, 200)'>`;
        insertions[endPoint] = '</span>';

        //let highlighted = nodeInDoc.innerHTML.insertTextAtIndices(insertions)
        //nodeInDoc.innerHTML = highlighted;
    };

    if (type == 'anchor') {
        highlightAnotation(object.anchor);
    }
    else if (type == 'middle') {
        for (let i=1; i<object.nodeList.length-1; i++) {
            //maybe have a diff function altogether so that it just adds span tags it at first and last char
            highlightAnotation(object.nodeList[i]);
        }
    }
    else if (type == 'focus') {
        highlightAnotation(object.focus);
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
        //custom font added parent document for use in shadowDOM
        let fontRule = document.createElement('style');
        fontRule.innerText = `
            @font-face {
                font-family: 'Revalia';
                src: url(` + chrome.runtime.getURL('fonts/Revalia-Regular.ttf') + `) format('truetype');
            }
        `;

        $(fontRule).appendTo('body');

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
                
                <div id='user-anotation-container' class='hidden'>
                    <textarea id='submission-input' name='user-anotation' rows='4'>Your thoughts</textarea>
                    <input type='text' id='source-input' name='source' value='Link'>
                    <br>
                    <input id='publish-anotation' type='submit' value='Publish'>
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
            #user-anotation-container {
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
            #publish-anotation {
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

        //shadowRoot.appendChild(header);
        shadowRoot.appendChild(shadowDomStyles);
        shadowRoot.appendChild(container);

        //saves repeating querySelector + readability
        contextMenuContainer = shadowRoot.querySelector('#context-menu-container');
        loadingIcon = shadowRoot.querySelector('#loading-icon');
        charCountContainer = shadowRoot.querySelector('#char-count');
        charCountText = shadowRoot.querySelector('.char-count-text');
        selectionMenu = shadowRoot.querySelector('#selection-menu');
        selectionMade = shadowRoot.querySelector('#selection-made');
        radioContainer = shadowRoot.querySelector('#radio-container');
        radioHeaders = shadowRoot.querySelectorAll('.radio-headers');
        radioButtons = shadowRoot.querySelectorAll('.selection-menu-radios');
        radioLabels = shadowRoot.querySelectorAll('.selection-menu-labels');
        exitButton = shadowRoot.querySelector('#exit-button');
        exitButton.addEventListener('click', exitContextMenu);
        confirmButton = shadowRoot.querySelector('#confirm-choices');
        confirmButton.addEventListener('click', confirmChoices);
        publishButton = shadowRoot.querySelector('#publish-anotation');
        publishButton.addEventListener('click', publishSubmission);
        argNatureContainer = shadowRoot.querySelector('#argument-nature-container')
        sourceContainer = shadowRoot.querySelector('#source-container')
        argumentNatureVals = shadowRoot.querySelectorAll('.argument-nature-radios');
        sourceVals = shadowRoot.querySelectorAll('.source-radios');
        anotationContainer = shadowRoot.querySelector('#user-anotation-container');
        submissionInput = shadowRoot.querySelector('#submission-input');
        sourceInput = shadowRoot.querySelector('#source-input');

        emptyVal = submissionInput.value;

        console.log('shadowRoot: ', shadowRoot);
        console.log('document: ', document);
        //console.log('container: ', container);    
        //console.log('classList: ', contextMenuContainer.classList.value);
    }
    else {
        //if already clicked once, just need to hide/unhide elements rather than creating them every time
        whenNotHovering(contextMenuContainer, function() {
            isFocussed = false;
            resetAnotation();
            if (isExpanded) {
                styleShadowDom(shadowRoot, ['#selection-quotes', '#exit-button', '#argument-nature-container', '#source-container'], [['display', 'none']]);    
                if (isConfirmed) {
                    if (!submission.isSource) {sourceInput.classList.remove('hidden');}
                    styleShadowDom(shadowRoot, ['#user-anotation-container'], [['display', 'none']])
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
    //console.log('isSelectMade: ', isSelectMade);
    //console.log('shadowRoot: ', shadowRoot);
    window.addEventListener('mouseup', doneSelecting);
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
                    initAnotation(selectionObj, finalSelection);
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
    
    window.addEventListener('mousedown', begunSelecting);
}

//event listeners
chrome.runtime.onMessage.addListener(handleContentRequests);

window.addEventListener('load', function() {
    window.addEventListener('mousedown', begunSelecting);

    
    let testData = {
        "anotationId": "ANTiogasm5yn",
        "textAnotated": "people being directed to test sites hundreds of miles from their",
        "isUnified": false,
        "anchor": {
            "nodeName": "#text",
            "nodeType": 3,
            "wholeText": "An increase in demand for coronavirus tests has led to local shortages - with some people being ",
            "parentNode": {
                "nodeName": "P",
                "nodeType": 1,
                "parentWholeText": "An increase in demand for coronavirus tests has led to local shortages - with some people being directed to test sites hundreds of miles from their homes."
            }
        },
        "focus": {
            "nodeName": "#text",
            "nodeType": 3,
            "wholeText": " from their homes.",
            "parentNode": {
                "nodeName": "P",
                "nodeType": 1,
                "parentWholeText": "An increase in demand for coronavirus tests has led to local shortages - with some people being directed to test sites hundreds of miles from their homes."
            }
        },
        "submissionsMade": {
            "SUBetqkfb8f6": {
                "submissionId": "SUBetqkfb8f6",
                "assignedTo": "ANTiogasm5yn",
                "urlOfArticle": "https://www.bbc.co.uk/news/uk-54156889",
                "argumentNature": "for",
                "submissionText": "Your thn, oughts",
                "isSource": false,
                "sourceLink": null
            }
        }
    }
    
    
    findAnotationInPage(testData, 'anchor');

    if (!testData.isUnified) {
        if ('nodeList' in testData) {
            if(testData.nodeList.length > 2) {findAnotationInPage(testData, 'middle')}
        }
        findAnotationInPage(testData, 'focus');
    }
    
});