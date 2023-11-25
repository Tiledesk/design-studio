# **DESIGN STUDIO - Changelog**

### **Authors**: 
    *Gabriele Panico*
    *Dario De Pascalis* 
### **Copyrigth**: *Tiledesk SRL*


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

