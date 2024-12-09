# **DESIGN STUDIO - Changelog**

### **Authors**: 
*Gabriele Panico* <br>
*Dario De Pascalis* <br>
*Giovanni Troisi* <br>
### **Copyrigth**: 
*Tiledesk SRL*

# 1.23.2
# 1.23.1

# 1.23.0

# 1.22.2
-  **bug-fixed**: avatar image not uploaded if another one already exists

# 1.22.1
# 1.22.0

# 1.22.0-rc.4
- **added**: uploaded control in audio base element

# 1.22.0-rc.3
- **bug-fixed**: minor fix action gpt-task on preview

# 1.22.0-rc.2
- **added**: fileUploadAccept env variable
- **added**: uploaded control after file is loaded

# 1.22.0-rc.1
- **added**: role guard to main root 

# 1.21.1
- **bug-fixed**: minor improvements

# 1.21.0

# 1.21.0-rc.16
- **added**: doc for new actions

# 1.21.0-rc.15
- **added**: image preload resolve for doc images
- **changed**: info-tooltip doc component UI

# 1.21.0-rc.14
-  **added**: changed: min value for max_tokens if citations checkbox is enabled

# 1.21.0-rc.13
-  **added**: 'connect_block', 'move_to_unassigned' and 'clear_transcript' actions
-  **added**: chatbot_id system-defined variable
-  **added**: enable 'connect_block' action only if present in project.profile

# 1.21.0-rc.12
-  **added**: formatType checkbox in action gpt-task
-  **added**: citations in action askkbv2
-  **added**: flowError variable in systemDefined array
-  **added**: community category 'Internal Processes'

# 1.20.6
- **removed**: export as csv option in cds-action-detail component

# 1.20.5
- **bug-fixed**: minor improvements

# 1.20.4

# 1.21.0-rc.11
- **bug-fixed**: minor improvements

# 1.21.0-rc.10
- **removed**: export as csv option in cds-action-detail component

# 1.21.0-rc.9
-  **added**: dynamicAttributes var description
-  **added**: response_type in action gpt task

# 1.21.0-rc.8
- **bug-fixed**: connector not updated while adding new command

# 1.21.0-rc.7
-  **added**: improvements on widget support component

# 1.20.3
- **bug-fixed**: minor improvements

# 1.20.2

# 1.21.0-rc.6
- **added**: timestamp, now, chatbotToken, UUID, UUIDv4 variables

# 1.21.0-rc.5
- **added**: o1-mini and o1-preview gpt models 

# 1.21.0-rc.4
-  **added**: inserted blockid and blockname parameters in the page url
- **bug-fixed**: graphical error when hovering over an empty intent when the "add action" button is displayed
- **bug-fixed**: get last child in url without parameters

# 1.21.0-rc.3
- **added**: 5m, 10m, 30m and 1h time slot for rules condition
- **bug-fixed**: copy "intent" without connectors
- **bug-fixed**: delete connector when "intent" is not selected
- **bug-fixed**: age-old bug of connector deletion error

# 1.21.0-rc.2
- **added**: removed all listener event when on navigation between tabs

# 1.21.0-rc.1
- **added**: loader while canvas is drawing intents and connectors

# 1.20.1

# 1.20.0

# 1.20.0-rc.1 
- **added**: slidet-top animation if autocomplete options is 
- **bug-fixed**: data.namespace is undefined ig attribute-dialog is opened from gpt actions
- **bug-fixed**: if autocomplete is open, cannot able to select variable from utils icon into cds-text component
- **bug-fixed**: if unknown namespace is selected and namaspaceAsName is deactiveted, reset to defautl namespace
- **bug-fixed**: if namespaceAsName is enabled and no namespace is selected, set the default one

# 1.19.4

# 1.19.4-rc.1
- **bug-fixed**: variable is not saved correctyle in cds-action-askkb-v2 

# 1.19.3

# 1.19.3-rc.5
- **added**: namespace variable added to attribute dialog if user request a preview in cds-action-askkb-v2

# 1.19.3-rc.4
- **added**: setAttributeBtn in cds-text base element component
- **added**: autocomplete options in white selecting namespace in cds-action-askkb-v2
- **bug-fixed**: cds-rules and cds-globals components do not scroll

# 1.19.3-rc.3
- **added**: ability to add wait time grather than 15s with text input in cds-action-wait
- **removed**: wait time grather than 15s in cds-action-reply and cds-action-reply-v2

# 1.19.3-rc.2
- **added**: delay-time grather than 10s with text input in cds-action-reply and cds-action-reply-v2
- **changed**: hide widget iframe when support component page is destroyed

# 1.19.3-rc.1
- **added**: checkbox use namespace as name in cds-action-ask-kbv2
- **changed**: dispose widget iframe when support component page is destroyed

# 1.19.1

# 1.19.1-rc.1
- **added**: limitCharsText to cds-action-reply-text v2
- **removed**: restartConversation from widget URL parameter

# 1.19.0

# 1.19.0-rc.2
- **added**: action doc contents 

# 1.19.0-rc.1
- **added**: tooltip element while hovering on menu action list

# 1.18.2-rc.3
- **added**: usage info into cds-action-gpt-task-v2 and cds-action-askkb-v2 actions
- **added**: variable to system-contenxt field into cds-action-gpt-task-v2 and cds-action-askkb-v2 actions
- **changed**: char limit to system-contenxt field into cds-action-gpt-task-v2 and cds-action-askkb-v2 actions

# 1.18.2

# 1.18.2-rc.2
- **changed**: disabled restartConversation in cds-panel-widget

# 1.18.2-rc.1
- **added**: convertToNumber function in cds-action-assign-variable

# 1.18.1

# 1.18.0-rc.5
- **added**: history property to cds-action-askkbv2

# 1.18.0-rc.4
- **added**: ani, dnis and callId voice property 
- **added**: disabled option to select base component

# 1.18.0-rc.3
- **added**: description msg for ignoreOperatingHours property into cds-action-online-agents

# 1.18.0-rc.2
- **added**: implement time slots on cds-action-operating-hours 
- **added**: ignoreOperatingHours property added on cds-action-online-agents-v2

# 1.18.0-rc.1
- **added**: cds-action-lead-update component
- **added**: gpt-4o-mini support

# 1.17.4
- **added**: gpt-4o-mini support 

# 1.17.3
- **bug-fixed**: if depId is not in list, set as null the assigned property

# 1.17.2
- **bug-fixed**: cds-action-askkb-v2 show same variable n-times into preview modal

# 1.17.1

# 1.17.1-rc.2
- **added**: check to hide/show actionCategory

# 1.17.1-rc.1
- **bug-fixed**: if two or more cds-action-reply-v2 is in the same intent, when user select one of them, also the first action is selected

# 1.17.0-rc.1
- **added**: check to project profile object to dynamically hide/show action

# 1.16.1

# 1.16.1-rc.1
- **bug-fixed**: connector not drowed if multiple cds-action-reply-v2 is in cascade 

# 1.16.0

# 1.16.0-rc.4
- **added**: eventActionChanged handler on cds-action-reply-v2

# 1.16.0-rc.3
- **added**: button alias

# 1.16.0-rc.2
- **added**: manage of blank answer for cds-action-askgpt-v2

# 1.16.0-rc.1
- **added**: connectors on cds-action-gallery buttons
- **changed**: disabled buttons click event 

# 1.15.0

# 1.15.0-rc.2
- **changed**: preview textarea min/max default line in cds-action-gpttask and cds-action-askgpt-v2
- **bug-fixed**: bot image profile is not loaded
 
# 1.15.0-rc.1
- **changed**: AI tokens default values for cds-action-gpt-task and cds-action-askkb-v2
- **changed**: timeout defautl values for voice actions

# 1.14.2
- **bug-fixed**: cds-action-delete-attribute not select the right value

# 1.14.1

# 1.14.0

# 1.14.0-rc.6
# 1.14.0-rc.5
- **added**: error message if token quotes exceeded

# 1.14.0-rc.4
- **bug-fixed**: add unexisting keys in action-askpgtv2

# 1.14.0-rc.3
# 1.14.0-rc.2
- **added**: voiceLanguage and voiceName variables to voiceFlow variables list

# 1.14.0-rc.1
- **added**: aiModels env variable managed for cds-action-askgpt and cds-action-gpt-task

# 1.13.1

# 1.13.0

# 1.13.0-rc.2
- **added**: new delay-text component to increment input timeout over 120s 
- **added**: ability to not activate NoInput and NoMatch connector if commands inside cds-action-replyv2 not contains buttons

# 1.13.0-rc.1
- **bug-fixed**: namespace select into cds-action-askgptv2 to not save data 

# 1.12.0 

# 1.12.0-rc.5
- **changed**: namescace model 
- **changed**: top_k range in action askkb_v2

# 1.12.0-rc.4
# 1.12.0-rc.3
- **added**: namespace, context and history properties into action-askgptv2

# 1.12.0-rc.2
- **removed**: disableInput option from voice actions

# 1.12.0-rc.1
- **changed**: voiceFlow variables restored
- **bug-fixed**: wait time in action-reply and action-reply-voice is incorrect if set to 0

# 1.11.0

# 1.11.0-rc.1
- **added**: cds-action-online-agents-v2

# 1.10.0

# 1.10.0-rc.3
# 1.10.0-rc.2
- **added**: status property to top left menu options to show/hide some options

# 1.10.0-rc.1
- **added**: 401 error code management on signInWithCustomToken

# 1.9.0

# 1.9.0-rc.2
- **added**: downloadURL in metadata obj while sending message from tiledesk

# 1.9.0-rc.1
- **added**: animation on 'Add action' cds-intent footer button
- **changed**: whatsappApiUrl to whatsappTemplatesBaseUrl env property

# 1.8.0

# 1.8.0-rc.2
- **changed**: set default values for cds-action-gpt-assistant and cds-action-reply-v2

# 1.8.0-rc.1
- **added**: cds-action-reply-v2
- **changed**: 'add action' button into cds-intent preview component UI changed

# 1.7.0

# 1.7.0-rc.1
- **added**: GPT-4o model into gpts actions
- **added**: dynamic label to delay-slider component
- **added**: voice flow variables
- **bug-fixed**: connector and timeout slider values not updated on changes

# 1.6.1

# 1.6.1-rc.1
- **changed**: encoded chatbot name in share link
- **bug-fixed**: assistantID is not saved correctly 

# 1.6.0

# 1.6.0-rc.6
- **added**: ai action category section <br> 
- **added**: clickout management for globals-detail panel <br>

# 1.6.0-rc.5
- **added**: ability to hide 'try on whatsapp' and 'test it out' header buttons if current route is not 'blocks'<br>
- **changed**: css of changelog component <br>

# 1.6.0-rc.4
- **added**: check on PRO action badge. show it depends on current project type and action plan availability<br>
- **bug-fixed**: if drop an action from an intent to another, connectors are lost<br>
 
# 1.6.0-rc.3
- **added**: form-data implementation as a body option in cds-action-web-request-v2<br>

# 1.6.0-rc.2
- **changed**: last_user_text user defined variable to lastUserText new user defined variable<br>
- **bug-fixed**: cds-action-gpt-assistant not save property as well<br>

# 1.6.0-rc.1
- **added**: cds-action-gpt-assistant<br>

# 1.5.2-rc.1
- **bug-fixed**: cds-action-set-attribute not save operand as well while select a variable from list<br>
- **bug-fixed**: cds-action-set-attribute tips select checkbox on click<br>
- **bug-fixed**: cds-action-reply textarea element autoresize on single row on focusout<br>

# 1.5.1

# 1.5.1-rc.1
- **bug-fixed**: cds-action-set-attribute-vs not show correct selected data if another action of the same type is already opened<br> 
- **bug-fixed**: cds-attributes save [object object] key while value text is changed<br> 

# 1.5.0

# 1.5.0-rc.3
- **added**: open variable-list component on keydown '{' in textarea component<br>
- **added**: previewAskPrompt function in openaiService<br>
 **added** namespace, max_tokens, temperature, top_k params in askkb action<br>
 **added** preview and ai settings in askkb action interface<br>
- **changed**:  gpttask action interface<br>
- **bug-fixed**: action-web-request-v2 not show correct selected data if another action of the same type is already opened<br>

# 1.5.0-rc.2
- **bug-fixed**: if chatbot not belongs to current project, redirect to unauthorized route<br> 

# 1.5.0-rc.1
- **added**: headers autocomplete options in web-request-v2 component<br>
- **added**: textarea component into action-gpt-task modal preview<br>
- **changed**: cds-popup position<br> 

# 1.4.0

# 1.3.2

# 1.4.0-rc.4
- minor improvements
- **bug-fixed**: community section doesn't scroll page<br>

# 1.4.0-rc.3
- **added**: autofocus on search input element on cds-add-action-menu floating panel component<br>
- **added**: ascendent ordering of actions in cds-add-action-menu floating panel<br>

# 1.4.0-rc.2
- **added**: cds-action-n8n<br>
- **added**: setTiledeskToken method on tiledesk-auth<br>

# 1.4.0-rc.1
- **added**: cds-action-speech-form voice action<br>
- **added**: cds-action-voice-play-prompt<br>
- **added**: audio-upload to manage audio file url and drag&drop action in cds-action-reply-audio<br>
- **changed**: open OptionMenu while adding a new unexisting option in cds-action-dtmf-menu voice component<br>
- **changed**: default value for request timeout in cds-action-web-requestv2<br>

# 1.3.1
- **bug-fixed**: document title fixed<br>

# 1.3.0
- **bug-fixed**: askgpt-v2 not create variables until detail is open<br>

# 1.3.0-rc.2
- **added**: lastUserDocumentAsAttachmentURL, lastUserDocumentAsInlineURL and strongAuthenticated variables<br>

# 1.3.0-rc.1
- **added**: settings section in cds-action-web-requestv2<br>
- **added**: decodedCustomJWT userDefined attribute var<br>

# 1.2.0

# 1.1.4

# 1.1.3

# 1.1.2

# 1.1.1

# 1.2.0-rc.10
- **added**: cds-action-brevo<br>
- **added**: default active tab on settings icon click<br>
- **removed**: import of cds/_variable.scss from components<br>

# 1.2.0-rc.9
- **added**: lazy modules<br>

# 1.2.0-rc.8
- **added**: PHONE_NUMBER to config-template env<br>

# 1.2.0-rc.7
- **added**: cds-action-dtmf-form and cds-action-blind-transfer<br>
- **added**: settings to vxml actions<br>
- **added**: gpt-4-preview type option to gpt-models<br>
- **bug-fixed**: action-replace-bot-v2 pass /+intentName<br>

# 1.2.0-rc.6
- **added**: brand name to header<br> 
- **bug-fixed**: if condition is changed in action-json-condition or filter, submit button is disabled<br>
- **bug-fixed**: if chatbot is associated with a dept and ther's depts with no chatbot associated with, do not show select with depts with no chatbot associated with<br>

# 1.2.0-rc.5
- **added**:  height on the iframe<br>
- **changed**: copy and paste, change action id when you paste<br>
- **changed**: change the cursor to + when the mouse is on the edge of the dot<br>
- **bug-fixed**: connectors disappear when you do action d&d.<br>

# 1.2.0-rc.4
- **bug-fixed**: minor bug-fixed<br>

# 1.2.0-rc.3
- **added**: DOCS translator object<br>

# 1.2.0-rc.2
- **added**: cds-action-customerio<br>
- **added**: customAttributes for support widget to identify current logged user plan<br>
- **removed**: assignResultTo from cds-action-customerio and cds-action-hubspot<br>

# 1.2.0-rc.1
- **added**: ability to copy/paste an action/block<br>

# 1.1.0

# 1.1.0-rc2
- **changed**: return changes to cds-attributes parent if attributes object is empty ( keys.length = 0 )<br>
- **bug-fixed**: cds-action-make and cds-action-hubspot bodyparameters set as object and not as a string<br>
- **bug-fixed**: cds-action-make and cds-action-hubspot custom-divider color<br>

# 1.1.0-rc1
- **added**: TYPE_GPT_MODEL const in utils and used in cds-action-askgptv2 and cds-action-gpt-task components<br>

# 1.0.14-rc.3
- **added**: dashboard integration redirect link in cds-action-qapla and cds-action-hubspot in favour of apiKey into action detail<br>
- **changed**: animation-delay reduced to 0 for all cds-panel components<br>
- **changed**: do not close and reopen again cds-panel-action-detail component if it's already opened<br>

# 1.0.14-rc.2
- **added**: new support component<br> 
- **added**: new play menu component<br>
- **added**: new share menu component<br>
- **added**: brandResources class now support nested array of objects<br>  

# 1.0.14-rc.1
- **added**: cds-action-askgptv2<br>
- **added**: variable-list tooltip description translations<br>
- **changed**: cds-action-code reduced max chars<br>  
- **changed**: cds-action-code available only for custom plan<br>

# 1.0.13.1
- **changed**: restore cds-action-change-department<br>

# 1.0.13

# 1.0.12

# 1.0.11.5
- **bug-fixed**: lowecase pipe not exist<br>

# 1.0.11.4
- **changed**: text limit to global value rows<br>

# 1.0.12-rc.3
- **added**: brandService added to load remote logos and resources<br>
- **changed**: logos and resources from remote json<br>
- **changed**: limit global value to 4026 characters<br>
- **bug-fixed**: lowecase pipe not exist<br>

# 1.0.12-rc.2
- **changed**: text limit to global value rows<br>

# 1.0.11.3
- **changed**: cds-action-delete-attribute now support all variables (userdefined and systemdefined)<br>

# 1.0.12-rc.1
- **added**: discord channel menu option on support bottom sidebar icon<br>
- **added**: style.scss, material-dashboard.scss and action-styl.scss as lazy load style<br>
- **changed**: show changelog only if minor version is changed<br> 
- **bug-fixed**: missing translations<br>
- **bug-fixed**: cds-textarea not updated<br>
- **bug-fixed**: widget installation code is not formatted while click on copy in Publish modal<br>
- **bug-fixed**: cannot read property of undefined reading _tdActionId with forms<br> 

# 1.0.11.2
- **bug-fixed**: cannot split of undefined<br>

# 1.0.11.1
- **bug-fixed**: cannot read property of undefined reading _tdActionId with forms<br>

# 1.0.11

# 1.0.11-rc.4
- **added**: cds-action-replace-bot-v2 with 'execute block' option<br>
- **added**: translation keys into cds-action components<br>
- **bug-fixed**: reset operator2 value if condition is 'IsEmpty' or 'isNull' or 'isUndefined'<br>
- **bug-fixed**: removed angular warning for readonly textarea deprecated propery with reactive Forms -> now ise control.disabled() or control.enabled()<br>
- **bug-fixed**: operand2 textarea not render textTag on init if readOnly is enabled<br>
- **bug-fixed**: if condition is changed to 'IsEmpty' or 'isNull' or 'isUndefined' in operand2 cds-action-json-condition textarea not reset correctly<br>
- **removed**: cds-action-replace-bot DEPRECATED<br>

# 1.0.11-rc.3
- **added**: isNull and isUndefined operator function for cds-action-json-condition<br>
- **bug-fixed**: compare alphabetic project/action plan rather than PLAN_NAME enum<br> 
- **bug-fixed**: attribute dialog-container component UI<br>
- **bug-fixed**: after deleted attribute from value field in cds-action-json-condition and cds-action-action-condition, restore base form with operator2.type = 'const'<br>
- **bug-fixed**: if click on existing condition and then add a new one, the last created condition is not pushed but replaced to che last selected condition<br>

# 1.0.11-rc.2
- **added**: share icon next to chatbot name in header component<br>
- **added**: badge on action-list for PRO action type<br>

# 1.0.11-rc.1
- **added**: cds-action-hubspot into integrations action-list section<br>
- **added**: check for action availability depends of current project plan<br>
- **bug-fixed**: on connect button with attributes (on undo, after deleting the intent, the intent connectors are not created)<br>

# 1.0.10

# 1.0.10-rc.4
- **added**: error message if global key contains not allowed chaacters<br>

# 1.0.10-rc.3
- **added**: ability to set variable as global key<br>
- **changed**: text limit to code textarea cds-action-code<br>
- **changed**: text limit to prompt textarea cds-action-gpt-task<br>

# 1.0.10-rc.2
- **added**: limit to 4 line for cds-action-code preview input box<br>
- **changed**: removed variable and emoji options from global value input detail component<br>

# 1.0.10-rc.1
- **added**: JSON.stringify function in TYPE_FUNCTION_LIST for cds-action-set-attribute<br>

# 1.0.9

# 1.0.9-rc.1
- **added**: cds-action-code<br>
- **added**: cds-mat-tooltip on variable-list item to show current variable description<br>
- **added**: currentPhoneNumber leadInfo attributes variable<br>
- **bug-fixed**: if open cds-panel-action-detail, then the stage is not draggable with mouse connected<br>

# 1.0.8

# 1.0.8-rc.1
- **added**: cds-global-panel-detail component to add/update/delete an existing global variable<br>
- **bug-fixed**: cannot set iframe url into cds-action-reply<br>
- **bug-fixed**: cannot delete image because of path url error<br>

# 1.0.7

# 1.0.7-rc.11
- **added**: trueIntent and falseIntent property into cds-action-make<br>
- **added**: cds-splash-screen component inside cds-globals section if no global variables are set to current chatbot<br>
- **changed**: activate submit button and disable 'Value' textarea i operator is equal to 'isEmpty' in cds-action-json-condition <br>
- **bug-fixed**: form and question icons not updated realtime if form or question is set<br>
- **bug-fixed**: cds-intent not draggable in some top point of the component<br>

# 1.0.7-rc.10
- **added**: success/failure branch on cds-action-gpt-task<br>
- **added**: GitHub link on sidebar bottom menu<br>
- **added**: ability to use local svg icon for menu component<br>
- **changed**: set 'Content-type' header option as 'application/json'<br> automatically if user select 'body' radio option, remove 'Content-type' header option  if user select 'none' in radio button<br>
- **changed**: moved globals on bottom in variable-list component<br>

# 1.0.7-rc.9
- **added**: upload/link option while loading an image from a source file or a link ora a variable dynamically<br>
- **added**: leadAttributes section for variableList<br>
- **added**: support icon menu on bottom section in cds-sidebar<br>
- **added**: cds-changelog component for new updates news<br>
- **added**: show function select if operand.function has a value in cds-action-assign-variable-v2<br>
- **added**: dynamic reuse of cds-menu element<br>
- **changed**: color defined variables<br> 
- **added**: cds-textarea in button url section to add variable as url for a button reply element<br>
- **bug-fixed**: floating action list hide called intent --> new Xpositioning<br> 

# 1.0.7-rc.8
- **added**: fullfillment section to cds-settings-developer tab section<br>
- **bug-fixed**: connectorTo not found (connector-point is fill but connector is not created )<br>
- **removed**: unused variable colors;<br>

# 1.0.7-rc.7
- **added**: label over a connector<br>
- **bug-fixed**: cds-globals not updated<br>
- **bug-fixed**: cds-action-make url is rendered ad variable into cds-textarea component<br>

# 1.0.7-rc.6
- **added**: cds-action-make<br>
- **added**: JSONparse function into cds-action-assing-variable-v2<br>
- **added**: padding to scaleAndCenter bottom-right button icon<br>
- **bug-fixed**: cds-action-assign-variable-v2 operand create double value obj<br>
- **bug-fixed**: cds-attributes not save changes in input component<br>
- **bug-fixed**: do not permit special chars when adding new variable<br>

# 1.0.7-rc.5
- **added**: cds-action-assign-variable-v2<br>

# 1.0.7-rc.4
- **added**: cdkDragPreview UI while dragging an action into the same block<br>
- **added**: cds-globals component to manage global attributes variables into chatbot obj<br>
- **added**: global variables to variablesList utils obj<br>
- **bug-fixed**: patch in action reply buttons without UUIDV4<br>
- **bug-fixed**: if clear operand variable inside cds-action-assign-variable, operation obj is not updated<br>
- **bug-fixed**: if 'readonly' input variable is updated in parent cds-textarea component, tag badge is not created <br>
# 1.0.7-rc.3
- **added**: close behaviour on mouse-tips modal close header icon<br>
- **bug-fixed**: close the add-actions-menu by clicking Backspace<br>
- **bug-fixed**: added an action from the floating menu<br>
- **bug-fixed**: changed the field type in the form email field<br>
- **bug-fixed**: cannot be able to restart the same intent while testing it on widget page<br>

# 1.0.7-rc.2
- **added**: mouse/trackpad tips<br>
- **added**: ability to add action from floating 'add action' button on each block<br>
- **changed**: cds-connector color on start and isLast intent elements<br>
- **changed**: aligned component to new Regex for variables with {{<\var>}}<br>
- **changed**: cds-action-assign-variable enable possibility to add custom text on operand2 property<br>
- **changed**: cds-intent footer 'Add action' button UI<br>
- **changed**: new services for updating an intent with multimple operations <br>
- **bug-fixed**: variable-list userDefined expansion panel not opened from the <br>second time

# 1.0.7-rc.1
- **added**: redirect to unauthorized page if signInWithCustomtoken response with 401 error<br>
- **bug-fixed**: cannot delete chatbot profile image<br>
- **bug-fixed**: action-web-requestv2 headers attributes variable not saved with double curly brackets<br>
- **bug-fixed**: cannot delete first button into cds-action-reply elements<br>
- **bug-fixed**: cannot clear header attriibutes on cds-web-request-v2<br>

# 1.0.6

# 1.0.6-rc.1
- **added**: Export/import redirect function on header menu option<br>
- **added**: extension panel on variable list<br>
- **added**: baseHref into angular.json<br>
- **added**: imageRepoService abstract service to recover chatbot profile image<br>
- **bug-fixed**: set default value for activeDetailSection<br>

# 1.0.5

# 1.0.5-rc.3
- **bug-fixed**: unable to restart widget flow if panel is already opened once (you had to click twice to restart the flow: first time to open panel and the second to restart the flow )<br>

# 1.0.5-rc.2
- **added**: cds-action-condition(w/out else branch)<br>
- **bug-fixed**: cds-reply button element not<br>
- **bug-fixed**: unable to delete bot avatar image profile<br>

# 1.0.4

# 1.0.4-rc.1
- **added**: network offline modal<br>
- **added**: menu component on left header tiledesk hover icon click<br>
- **bug-fixed**: goToKNB dashboard link <br>

# 1.0.3
- **added**: menu component on left header tiledesk hover icon click<br>
- **bug-fixed**: attribute.nextActionIntent not updated after change intent obj<br>
- **bug-fixed**: intent name not updated on intent-list component<br>
- **bug-fixed**: goToKNB dashboard link <br>

# 1.0.2

# 1.0.2-rc.1
 minor improvements

# 1.0.1

# 1.0.1-rc.1
- **added**: cds-action-qapla<br>
- **changed**: select and button in department choise in chatbot detail section<br>
- **bug-fixed**: modal-window not show translated labels<br>
- **bug-fixed**: question/form button in cds-intent canvas element not updated in realtime<br>
- **bug-fixed**: form-add-field height not fixed and change cds-dashboard main height<br>
- **bug-fixed**: connectors not adapted on cds-intent height changes<br>
- **bug-fixed**: afterviewinit stage is traslated and hides 'start' intent<br>
- **bug-fixed**: if only default department exist and not has a bot, do not show choise department section <br>
- **removed**: possibility to add a new action on the selected intent from bottom section of the same intent<br>

# 1.0.0

# 0.0.8
- **added**: retrocompatibility with intent that already contains an action of type 'connect block'<br>
- **changed**: routing path /cds/ to /chatbot/<br>
- **changed**: base href into intex.html<br>

# 0.0.7
- **added**: translations on action_category panel-element<br>
- **added**: disabled text highlight on zoom-in/zoom-out icon double click event<br>
- **added**: limit scale zoom<br>
- **changed**: intent base padding<br>
- **changed**: hide secrets section<br>
- **changed**: restored version on logo mouse hover <br>
- **changed**: preview label on cds-action-gpt-task component<br>
- **changed**: increased minRow cds-action-hide-message<br>
- **changed**: preview label in favour of icon in cds-action-close and cds-action-agent-handoff<br>
- **changed**: cds-settings detail section button UI<br>
- **bug-fixed**: cds-action-reply-gallery preview not open button on click<br>
- **bug-fixed**: cds-panel-button-configuration not save url changes<br>
- **bug-fixed**: start intent show 'add action' button on hover<br>
- **bug-fixed**: cannot drag action from an existing block to a new one<br>
- **bug-fixed**: cds-panel-action-detail not change action data on action change<br>

# 0.0.6
- **added**: translations<br>
- **added**: brandService<br>
- **added**: remove connect to block from Capture user reply<br>
- **changed**: thicken the connectors by one px<br>
- **changed**: gray connector color<br>

# 0.0.5
- **added**: loader on cds-dashboard<br>
- **added**: cds-secrets component in cds-sidebar (beta)<br>
- **bug-fixed**: buttons connector not aligned with button-container while dragging<br>

# 0.0.4
- **added**: new cds-modal-activate-bot while publishing a chatbot<br>
- **added**: options on cds-connector<br>
- **added**: drag icon in cds-description component only for previewMode<br>
- **changed**: background and icon colors in cds-sidebar and cds-panel-intents-list<br>
- **changed**: cds-action padding increased <br>
- **changed**: cds-action-reply text element background and padding increased<br>
- **removed**: webhook option from panel-intent-controls component<br>

# 0.0.3
- **added**: cds-option zoom-in zoom-out and centerStage<br>
- **added**: type in metadata element in cds-action-reply components<br>
- **bug-fixed**: live-active-intent animation restored<br>

# 0.0.2
- **added**: hashing routing strategy<br>
- **added**: check before add new userDefined variable<br>
- **added**: ability to delete a userDefined variable<br>
- **added**: 404 not found component<br>
- **changed**: minor UI improvements<br>
- **bug-fixed**: not sent null text if textarea is null in action-reply image and gallery elements<br>


# 0.0.1
 first deploy<br>

