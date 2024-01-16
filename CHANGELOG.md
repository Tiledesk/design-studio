# **DESIGN STUDIO - Changelog**

### **Authors**: 
    *Gabriele Panico*
    *Dario De Pascalis* 
### **Copyrigth**: *Tiledesk SRL*

### 1.0.11-rc.2
- added: share icon next to chatbot name in header component
- added: badge on action-list for PRO action type

### 1.0.11-rc.1
- added: cds-action-hubspot into integrations action-list section
- added: check for action availability depends of current project plan
- bug-fixed: on connect button with attributes (on undo, after deleting the intent, the intent connectors are not created)

### 1.0.10 in PROD

### 1.0.10-rc.4
- added: error message if global key contains not allowed chaacters

### 1.0.10-rc.3
- added: ability to set variable as global key
- changed: text limit to code textarea cds-action-code
- changed: text limit to prompt textarea cds-action-gpt-task

### 1.0.10-rc.2
- added: limit to 4 line for cds-action-code preview input box
- changed: removed variable and emoji options from global value input detail component

### 1.0.10-rc.1
- added: JSON.stringify function in TYPE_FUNCTION_LIST for cds-action-set-attribute

### 1.0.9 in PROD

### 1.0.9-rc.1
- added: cds-action-code
- added: cds-mat-tooltip on variable-list item to show current variable description
- added: currentPhoneNumber leadInfo attributes variable
- bug-fixed: if open cds-panel-action-detail, then the stage is not draggable with mouse connected

### 1.0.8 in PROD

### 1.0.8-rc.1
- added: cds-global-panel-detail component to add/update/delete an existing global variable
- bug-fixed: cannot set iframe url into cds-action-reply 
- bug-fixed: cannot delete image because of path url error

### 1.0.7 in PROD

### 1.0.7-rc.11
- added: trueIntent and falseIntent property into cds-action-make
- added: cds-splash-screen component inside cds-globals section if no global variables are set to current chatbot
- changed: activate submit button and disable 'Value' textarea i operator is equal to 'isEmpty' in cds-action-json-condition 
- bug-fixed: form and question icons not updated realtime if form or question is set
- bug-fixed: cds-intent not draggable in some top point of the component

### 1.0.7-rc.10
- added: success/failure branch on cds-action-gpt-task
- added: GitHub link on sidebar bottom menu
- added: ability to use local svg icon for menu component
- changed: set 'Content-type' header option as 'application/json' automatically if user select 'body' radio option, remove 'Content-type' header option  if user select 'none' in radio button
- changed: moved globals on bottom in variable-list component

### 1.0.7-rc.9
- added: upload/link option while loading an image from a source file or a link ora a variable dynamically
- added: leadAttributes section for variableList
- added: support icon menu on bottom section in cds-sidebar
- added: cds-changelog component for new updates news
- added: show function select if operand.function has a value in cds-action-assign-variable-v2
- added: dynamic reuse of cds-menu element
- changed: color defined variables 
- added: cds-textarea in button url section to add variable as url for a button reply element
- bug-fixed: floating action list hide called intent --> new Xpositioning 

### 1.0.7-rc.8
- added: fullfillment section to cds-settings-developer tab section
- bug-fixed: connectorTo not found (connector-point is fill but connector is not created )
- removed: unused variable colors;

### 1.0.7-rc.7
- added: label over a connector
- bug-fixed: cds-globals not updated
- bug-fixed: cds-action-make url is rendered ad variable into cds-textarea component

### 1.0.7-rc.6
- added: cds-action-make
- added: JSONparse function into cds-action-assing-variable-v2
- added: padding to scaleAndCenter bottom-right button icon
- bug-fixed: cds-action-assign-variable-v2 operand create double value obj
- bug-fixed: cds-attributes not save changes in input component
- bug-fixed: do not permit special chars when adding new variable 

### 1.0.7-rc.5
- added: cds-action-assign-variable-v2

### 1.0.7-rc.4
- added: cdkDragPreview UI while dragging an action into the same block
- added: cds-globals component to manage global attributes variables into chatbot obj
- added: global variables to variablesList utils obj
- bug-fixed: patch in action reply buttons without UUIDV4
- bug-fixed: if clear operand variable inside cds-action-assign-variable, operation obj is not updated 
- bug-fixed: if 'readonly' input variable is updated in parent cds-textarea component, tag badge is not created 
### 1.0.7-rc.3
- added: close behaviour on mouse-tips modal close header icon
- bug fixed: close the add-actions-menu by clicking Backspace
- bug fixed: added an action from the floating menu
- bug fixed: changed the field type in the form email field
- bug-fixed: cannot be able to restart the same intent while testing it on widget page

### 1.0.7-rc.2
- added: mouse/trackpad tips
- added: ability to add action from floating 'add action' button on each block
- changed: cds-connector color on start and isLast intent elements
- changed: aligned component to new Regex for variables with {{<\var>}}
- changed: cds-action-assign-variable enable possibility to add custom text on operand2 property
- changed: cds-intent footer 'Add action' button UI
- changed: new services for updating an intent with multimple operations 
- bug-fixed: variable-list userDefined expansion panel not opened from the second time

### 1.0.7-rc.1
- added: redirect to unauthorized page if signInWithCustomtoken response with 401 error
- bug-fixed: cannot delete chatbot profile image in PROD
- bug-fixed: action-web-requestv2 headers attributes variable not saved with double curly brackets
- bug-fixed: cannot delete first button into cds-action-reply elements
- bug-fixed: cannot clear header attriibutes on cds-web-request-v2

### 1.0.6 in PROD

### 1.0.6-rc.1
- added: Export/import redirect function on header menu option
- added: extension panel on variable list
- added: baseHref into angular.json
- added: imageRepoService abstract service to recover chatbot profile image
- bug-fixed: set default value for activeDetailSection

### 1.0.5 in PROD

### 1.0.5-rc.3
- bug-fixed: unable to restart widget flow if panel is already opened once (you had to click twice to restart the flow: first time to open panel and the second to restart the flow )

### 1.0.5-rc.2
- added: cds-action-condition(w/out else branch)
- bug-fixed: cds-reply button element not
- bug-fixed: unable to delete bot avatar image profile

### 1.0.4 in PROD

### 1.0.4-rc.1
- added: network offline modal
- added: menu component on left header tiledesk hover icon click
- bug-fixed: goToKNB dashboard link 

### 1.0.3 in PROD
- added: menu component on left header tiledesk hover icon click
- bug-fixed: attribute.nextActionIntent not updated after change intent obj
- bug-fixed: intent name not updated on intent-list component
- bug-fixed: goToKNB dashboard link 

### 1.0.2 in PROD

### 1.0.2-rc.1
- minor improvements

### 1.0.1 in PROD

### 1.0.1-rc.1
- added: cds-action-qapla
- changed: select and button in department choise in chatbot detail section
- bug-fixed: modal-window not show translated labels
- bug-fixed: question/form button in cds-intent canvas element not updated in realtime
- bug-fixed: form-add-field height not fixed and change cds-dashboard main height
- bug-fixed: connectors not adapted on cds-intent height changes
- bug-fixed: afterviewinit stage is traslated and hides 'start' intent
- bug-fixed: if only default department exist and not has a bot, do not show choise department section 
- removed: possibility to add a new action on the selected intent from bottom section of the same intent

### 1.0.0 in PROD

### 0.0.8
- added: retrocompatibility with intent that already contains an action of type 'connect block'
- changed: routing path /cds/ to /chatbot/
- changed: base href into intex.html

### 0.0.7
- added: translations on action_category panel-element
- added: disabled text highlight on zoom-in/zoom-out icon double click event
- added: limit scale zoom
- changed: intent base padding
- changed: hide secrets section
- changed: restored version on logo mouse hover 
- changed: preview label on cds-action-gpt-task component
- changed: increased minRow cds-action-hide-message
- changed: preview label in favour of icon in cds-action-close and cds-action-agent-handoff
- changed: cds-settings detail section button UI
- bug-fixed: cds-action-reply-gallery preview not open button on click
- bug-fixed: cds-panel-button-configuration not save url changes
- bug-fixed: start intent show 'add action' button on hover
- bug-fixed: cannot drag action from an existing block to a new one
- bug-fixed: cds-panel-action-detail not change action data on action change

### 0.0.6
- added: translations
- added: brandService
- added: remove connect to block from Capture user reply
- changed: thicken the connectors by one px
- changed: gray connector color

### 0.0.5
- added: loader on cds-dashboard
- added: cds-secrets component in cds-sidebar (beta)
- bug-fixed: buttons connector not aligned with button-container while dragging

### 0.0.4
- added: new cds-modal-activate-bot while publishing a chatbot
- added: options on cds-connector
- added: drag icon in cds-description component only for previewMode
- changed: background and icon colors in cds-sidebar and cds-panel-intents-list
- changed: cds-action padding increased 
- changed: cds-action-reply text element background and padding increased
- removed: webhook option from panel-intent-controls component

### 0.0.3
- added: cds-option zoom-in zoom-out and centerStage
- added: type in metadata element in cds-action-reply components
- bug-fixed: live-active-intent animation restored

### 0.0.2
- added: hashing routing strategy
- added: check before add new userDefined variable
- added: ability to delete a userDefined variable
- added: 404 not found component
- changed: minor UI improvements
- bug-fixed: not sent null text if textarea is null in action-reply image and gallery elements


### 0.0.1
- first deploy

