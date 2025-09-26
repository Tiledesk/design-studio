# **DESIGN STUDIO - Changelog**

### **Authors**: 
*Gabriele Panico* <br>
*Dario De Pascalis* <br>
*Giovanni Troisi* <br>
### **Copyrigth**: 
*Tiledesk SRL*


# 1.39.0-rc23

# 1.39.0-rc22
- **changed**: disabled badge "NEW" on "replaceAIAgent", "AddKBContent", "FlowLog"

# 1.39.0-rc21
- **added**: changed the selection of LLM and model to only one select in ai-condition
- **bug-fix**: fixed prompt saving error in "ai-condoition"
- **changed**: graphical changes in the "ai-condition" action preview

# 1.39.0-rc20

# 1.39.0-rc19
- **added**: noMatch for action DTMF_Form for voice bot

# 1.39.0-rc18
- **bug-fix**: new order, openai and ollama never red

# 1.39.0-rc17
- **bug-fix**: added catch (error) in getElevenLabsVoices and getElevenLabsModels

# 1.39.0-rc16
- **bug-fix**: Fixed save prompt error

# 1.39.0-rc15
- **added**: Added text area with autocomplete in LLM model selection

# 1.39.0-rc14
- **changed**: changed the selection of LLM and model to only one select

# 1.39.0-rc12
- **changed**: added default intructions value "User said: {{lastUserText}}"

# 1.39.0-rc11
- **added**: deprecation message and badge status. GPT Task action set as deprecated

# 1.39.0-rc10
- **bug-fix**: on Action AI-prompt, if I add a variable to the model, it doesn't save correctly.

# 1.39.0-rc9
- **bug-fix**: fixed bug new connector in action ai-condition 

# 1.39.0-rc8
- **bug-fix**: fixed bugs in action ai-condition

# 1.39.0-rc7
- **added**: disabled property for mat-slider in ai-settings section

# 1.39.0-rc6
- **added**: added action ai-condition

# 1.39.0-rc5
- **added**: additionalText input property in cds-text component
- **added**: managed openai and ollama models for AiPrompt action
- **added**: name of selected namespace in AskKbv2 action
- **changed**: disabled action gpt_task
- **removed**: TYPE_GPT_MODEL in favour of OPENAI_MODEL

# 1.39.0-rc4
- **added**: gpt-5 models in AI Prompt action

# 1.39.0-rc3
- **changed**: set text charts limit to 10000
- **changed**: changed the name of JSON buttons to (JSON Buttons and JSON Carousel) and always show it

# 1.39.0-rc2
- **changed**: anyComponentStyle maximum error limit

# 1.39.0-rc1
- **changed**: added scroll button left and right on image gallery

# 1.38.4
- **changed**: added left and right scroll button in image gallery

# 1.38.3
- **changed**: set text charts limit to 10000
- **changed**: changed the name of JSON buttons to (JSON Buttons and JSON Carousel) and always show it

# 1.38.2
- **changed**: ai models upgraded

# 1.38.2
- **changed**: ai models upgraded

# 1.38.1
- **changed**: Changed connector-width in 2px

# 1.38.0


# 1.38.0-rc20
- **added**: ability to manage Share_Items from BrandSrc

# 1.37.5
- **bug-fixed**: Voice menu compatibility patch if there is no subtype

# 1.38.0-rc19
- **bug-fixed**: Voice menu compatibility patch if there is no subtype

# 1.38.0-rc18
- **bug-fixed**: in setattribute update the size of the "value" field to 100,000

# 1.38.0-rc17
- **bug-fixed**: Changed the connector stroke width and color;

# 1.38.0-rc16
- **changed**: Changed the connector stroke width and color;
- **bug-fixed**: After the refresh, the label on the connectors is not displayed.
- **bug-fixed**: If I hide the connector and refresh I see the extended connector and the contracted one.

# 1.38.0-rc15
- **changed**:: change textarea limitCharsText (from 10.000 to 100.000) in system context cds-action-ai-prompt, system context cds-action-askgpt-v2, prompt cds-action-gpt-assistant, prompt cds-action-gpt-task;
- **changed**:: enabled hundreds separator for numeric characters in textarea.component


# 1.38.0-rc14
- **added**: Open KNB link in new tab in intent detail panel

# 1.38.0-rc13
- **bug-fixed**: when i drag and drop an action from the menu, if i go back to the actions menu bar without releasing the action, the submenu disappears
- **changed**: Insert the name of the selected KB as the first element in the "Ask KB" action.
- **bug-fixed**: Dragging the "Start" intent doesn't work on edges. The action detail shouldn't open when I drag and drop, but only when I click.

# 1.38.0-rc12
- **changed**: stand-by chatbot Patch that finds and fixes all broken buttons

# 1.38.0-rc11
- **added**: added chatbot Patch that finds and fixes all broken buttons

# 1.38.0-rc10
- **bug-fixed**: css ng-select-opened
- **bug-fixed**: enabled variable list userDefined
- **bug-fixed**: button is too far from the Examples in json buttons of action reply

# 1.38.0-rc9
- **added**: added load image from url in ds-action-reply-image
- **added**: fixed isLiquidjs in textarea

# 1.38.0-rc8
- **bug-fixed**: bug fixed: css gallery-json-select

# 1.38.0-rc7
- **added**: added models in json-gallery
- **bug-fixed**: bug fix edit button in action gallery

# 1.38.0-rc6
- **added**: added chatbot_type in utils variableList

# 1.38.0-rc5
- **added**: added image by url in action reply gallery

# 1.38.0-rc4
- **bug-fixed**: scss fix in action reply gallery

# 1.38.0-rc3
- **added**: json gallery in action reply gallery

# 1.38.0-rc2
- **changed**: refactoring intent component

# 1.38.0-rc1
- **bug-fixed**: broken connector and full dot when deleting a connector in an action reply

# 1.37.4
- **bug-fixed**: added models in json-gallery

# 1.37.3
- **changed**: enable/disable alpha slider in askkb-v2 action

# 1.37.2
- **bug-fixed**: delete webhook only when it is stopped

# 1.37.1

# 1.37.0-rc3
- **bug-fixed**: delete webhook only when it is stopped

# 1.37.0-rc2
- **bug-fixed**: widget-log: disabled collapse row; stop webhook log when click on the stage

# 1.37.0-rc1
- **changed**: Ask Kb type from 'text' to 'faq'

# 1.36.1
- **bug-fixed**: css bug fixed in widget-log 

# 1.36.0-rc7
- **bug-fixed**: css bug fixed in widget-log 

# 1.36.0-rc6
- **bug-fixed**: added width and height to previewModel images in action reply gallery
- **bug-fixed**: in widget-log added ellips on the row, row opening, fixed display for very long texts, added selectable text, graphic adjustments

# 1.36.0-rc5
- **changed**: added ellips in log lines in ds-widget-logs.component

# 1.36.0-rc4
- **bug-fixed**: all actions that contain block selection on true/false do not display connector on stage when create via action detail panel
- **bug-fixed**: about corrupted connectors with full dot but no connector on the stage
- **bug-fixed**: the webhook opens the detail also on drag, it should open it only on click

# 1.36.0-rc3
- **bug-fixed**: updated textarea value in action AI prompt

# 1.36.0-rc2
- **added**: voice preview player for elevenlabs voices for voice_twilio chatbot type

# 1.36.0-rc1
- **added**: support for elevenLabs voices for voice_twilio chatbot 

# 1.36.0
- **bug-fixed**: added width and height to previewModel images in action reply gallery
- **bug-fixed**: in widget-log added ellips on the row, row opening, fixed display for very long texts, added selectable text, graphic adjustments
- **changed**: added ellips in log lines in ds-widget-logs.component
- **bug-fixed**: all actions that contain block selection on true/false do not display connector on stage when create via action detail panel
- **bug-fixed**: about corrupted connectors with full dot but no connector on the stage
- **bug-fixed**: the webhook opens the detail also on drag, it should open it only on click

# 1.35.2
- **bug-fixed**: updated textarea value in action AI prompt

# 1.35.1

# 1.35.0-rc13
- **bug-fixed**: getWebhook only if block is "webhook"

# 1.35.0-rc12
- **bug-fixed**: show first log message via static service call

# 1.35.0-rc11
- **bug-fixed**: Start log of a chatbot or webhook
- **bug-fixed**: Stop and restart log on webhook regeneration

# 1.35.0-rc10
- **bug-fixed**: create a webhook when chatbot starts only if chatbot automation

# 1.35.0-rc9
- **bug-fixed**: enabled chunks_only check and pass chunks_only var in ActionAskGPTV2

# 1.35.0-rc8
- **bug-fixed**: enabled chunks_only check and pass chunks_only var in ActionAskGPTV2
- **added**: added findAndUpdateProperty TTS_MODEL and STT_MODEL in voice-settings

# 1.35.0-rc7
- **bug-fixed**: css chunks list in ActionAskGPTV2

# 1.35.0-rc6
- **added**: Show used chunks in ActionAskGPTV2

# 1.35.0-rc5
- **bug-fixed**: Changed action param "aplpha" to "alpha" in ActionAskGPTV2

# 1.35.0-rc4
- **bug-fixed**: Changed chunksOnly to chunks_only in ActionAskGPTV2
- **bug-fixed**: Create webhooks only when chatbotSubtype !== chatbot on startup.

# 1.35.0-rc3
- **added**: added "search only" parameter and filter on parameter in kb
- **changed**: in connector selection the connectable blocks are in alphabetical order (in go to block)
- **changed**: in replace AI agent the slug in brackets is added if it exists

# 1.35.0-rc2
- **changed**: New log level supported (native)
- **added**: Added to Flow Logs action the log level
- **added**: added to local storage the log panel status
- **bug-fixed**: the "start" color, changed back to white

# 1.35.0-rc1
- **added**: added webhook creation in intent component when webhook/copilot block is displayed
- **bug-fixed**: fixed bug on webhook stop/play to make it restart from first block to play


# 1.35.0


# 1.34.1
- **bug-fixed**: in AI prompt action, model must match value, now it matches label
- **changed**: hidden alpha limit slider in the ask gpt v2 action

# 1.34.0-rc6
- **bug-fixed**: Drag and drop on intent header not working
- **changed**: Fix CDS interface for Liquid on textarea
- **changed**: Highlighted log line needs to be lighter color

# 1.34.0-rc5
- **added**: Added alpha parameter on CDS in AI settings of ask kb
- **changed**: preview text in action set attribute truncated to 8 lines
- **added**: in each textarea with attributes button enabled, added 3 liquid buttons

# 1.34.0-rc4
- **bug-fixed**: in deleteWebhook changed the parameter passed in the call from chatbot_id to webhook_id
- **changed**: changed cursor icon in the header log panel
- **added**: added background color animation on log lines
- **changed**: changed follow log icons
- **bug-fixed**: when I press stop test the log does not close

# 1.34.0-rc3
- **bug-fixed**: fixed translation of AvailableToAgents
- **bug-fixed**: enabled resize on json buttons box
- **bug-fixed**: added "on" in: More on JSON buttons
- **bug-fixed**: fixed json buttons in preview action reply
- **added**: added summary to action add content to kb
- **changed**: intent title and highlighted border must be the same, without opacity
- **changed**: changed icon in action log

# 1.34.0-rc2
- **changed**: set default val "kb_chunks"

# 1.34.0-rc1
- **added**: "Chunks only" in action "ask knowledge base"

# 1.34.0

# 1.33.0-rc3
- **added**: TTS_VOICE_LANGUAGE to voice settings section

# 1.33.0-rc2
- **added**: set default chunks value

# 1.33.0-rc1
- **added**: added "Assign KB Chunks to" in action "ask knowledge base"

# 1.32.2
- **changed**: limit chunk to 40
- **added**: move position on start on "intent webhook"
- **bug-fixed**: restored VOICE_TWILIO in utils-actions
- **added**: added tooltip in log panel
- **bug-fixed**: Status 200 not displayed with newly created webhook
- **bug-fixed**: Labels ProductionURL/Development URL
- **changed**: Open Webhook detail in Large Mode
- **bug-fixed**: “Development webhook is currently turned off”: the first time you press start it doesn’t work
- **bug-fixed**: Fix margins on hover in History
- **bug-fixed**: Remove action Replace Bot from Webhook
- **bug-fixed**: Remove action Lead update from Webhook
- **bug-fixed**: Remove action Change Department from Webhook
- **bug-fixed**: Rename action Replace Bot to Replace AI Agent
- **bug-fixed**: Log highlight must flash even if you click on a log of the same block
- **bug-fixed**: On the webhook play you must also center the “start” of the webhook like other blocks (vertically)
- **bug-fixed**: changed padding-left in publish-history
- **added**: added animation log message
- **bug-fixed**: fixed z-index on "message url copied"
- **bug-fixed**: changed webhook labels
- **bug-fixed**: Removed "change department"
- **bug-fixed**: changed "Replace bot" to "Replace AI Agent”
- **changed**: replaced 'voice-twilio' with 'voice_twilio'
- **added**: Display a message on the Release History page when there are no versions
- **added**: ability to reset voice settings select options
- **bug-fixed**: cannot able to save voice settings if globals not exist yes
- **bug-fixed**: show all log messages
- **bug-fixed**: added border on intent selected when log is active
- **bug-fixed**: fixed cssbugs in panel log
- **bug-fixed**: minor fix on chatbot types
- **bug-fixed**: Check last repeated log in webhooks. To replicate, start a webhook, call it, then stop and play again. Last log of web response reappears.
- **bug-fixed**: Check first log in ai agents. The first log is “action reply terminated”, it seems that the first log is lost. Question of queue subscription timing?
- **bug-fixed**: Publish button disappeared in webhooks: you always see the dev url that should be visible only after pressing play and should disappear when you press stop.
- **bug-fixed**: Put separate production and dev urls in the webhook detail
- **bug-fixed**: If you press play on the webhook and then stop without calling it, the webhook block continues to flash
- **bug-fixed**: In the webhook detail use the default setting “wide” so that the entire url is visible
- **bug-fixed**: Widen the div of the dev url next to the start/stop and add a tooltip that says “Copy dev url” and after copying it replace “Text copied successfully” with “Dev url copied successfully”
- **bug-fixed**: Regenerate button must show alert that says “Warning, regenerating the webhook url the previous url will no longer be available”.
- **added**: voice settings tab into settings section to configure provider, voice, tts model and stt model (only for voice chatbot)


# 1.31.4
- **bug-fixed**: bug fixed textarea
- **bug-fixed**: hide connector icon
- **bug-fixed**: set attributes and select block in panel button reply  



# 1.32.0-rc13
- **changed**: limit chunk to 40
- **added**: move position on start on "intent webhook"

# 1.32.0-rc12
- **bug-fixed**: restored VOICE_TWILIO in utils-actions
- **added**: added tooltip in log panel

# 1.32.0-rc11
- **bug-fixed**: Status 200 not displayed with newly created webhook
- **bug-fixed**: Labels ProductionURL/Development URL
- **changed**: Open Webhook detail in Large Mode
- **bug-fixed**: “Development webhook is currently turned off”: the first time you press start it doesn’t work
- **bug-fixed**: Fix margins on hover in History
- **bug-fixed**: Remove action Replace Bot from Webhook
- **bug-fixed**: Remove action Lead update from Webhook
- **bug-fixed**: Remove action Change Department from Webhook
- **bug-fixed**: Rename action Replace Bot to Replace AI Agent
- **bug-fixed**: Log highlight must flash even if you click on a log of the same block
- **bug-fixed**: On the webhook play you must also center the “start” of the webhook like other blocks (vertically)

# 1.32.0-rc10
- **bug-fixed**: changed padding-left in publish-history

# 1.32.0-rc9
- **added**: added animation log message
- **bug-fixed**: fixed z-index on "message url copied"
- **bug-fixed**: changed webhook labels
- **bug-fixed**: Removed "change department"
- **bug-fixed**: changed "Replace bot" to "Replace AI Agent”

# 1.32.0-rc8
- **changed**: replaced 'voice-twilio' with 'voice_twilio'

# 1.32.0-rc7
- **added**: Display a message on the Release History page when there are no versions

# 1.32.0-rc6
- **added**: ability to reset voice settings select options
- **bug-fixed**: cannot able to save voice settings if globals not exist yes

# 1.32.0-rc5
- **bug-fixed**: show all log messages
- **bug-fixed**: added border on intent selected when log is active
- **bug-fixed**: fixed cssbugs in panel log

# 1.32.0-rc4

# 1.32.0-rc3
- **bug-fixed**: minor fix on chatbot types

# 1.32.0-rc2
- **bug-fixed**: Check last repeated log in webhooks. To replicate, start a webhook, call it, then stop and play again. Last log of web response reappears.
- **bug-fixed**: Check first log in ai agents. The first log is “action reply terminated”, it seems that the first log is lost. Question of queue subscription timing?
- **bug-fixed**: Publish button disappeared in webhooks: you always see the dev url that should be visible only after pressing play and should disappear when you press stop.
- **bug-fixed**: Put separate production and dev urls in the webhook detail
- **bug-fixed**: If you press play on the webhook and then stop without calling it, the webhook block continues to flash
- **bug-fixed**: In the webhook detail use the default setting “wide” so that the entire url is visible
- **bug-fixed**: Widen the div of the dev url next to the start/stop and add a tooltip that says “Copy dev url” and after copying it replace “Text copied successfully” with “Dev url copied successfully”
- **bug-fixed**: Regenerate button must show alert that says “Warning, regenerating the webhook url the previous url will no longer be available”.

# 1.32.0-rc1
- **added**: voice settings tab into settings section to configure provider, voice, tts model and stt model (only for voice chatbot)

# 1.31.4
- **bug-fixed**: bug fixed textarea
- **bug-fixed**: hide connector icon
- **bug-fixed**: set attributes and select block in panel button reply  

# 1.31.2-rc10
- **added**: Adds the ability to roll a chatbot back to a previous version

# 1.31.2-rc9
- **changed**: bug fix and change animation block intent selected on testit

# 1.31.2-rc8
- **changed**: change web log active 

# 1.31.2-rc7
- **changed**: change the web log animation of the selected intent

# 1.31.2-rc6
- **bug-fixed**: change attributes in web-request json body textarea to {{ attribute|json }}
- **bug-fixed**: fixed css textarea, bug "added attributes". 

# 1.31.2-rc5
- **added**: added webhook play and stop to header canvas

# 1.31.2-rc4
- **bug-fixed**: changed labels for add_kb_content action

# 1.31.2-rc3
- **added**: new action add_kb_content

# 1.31.2-rc2
- **bug-fixed**: changed freePlanLimitDate

# 1.31.3


# 1.31.2-rc1
- **bug-fixed**: test freePlanLimitDate


# 1.31.1
- **bug-fixed**: disabled widget log 


# 1.31.0


# 1.31.0-rc.14
- **bug-fixed**: deleted the connector object from the intent attributes connectors node when:
delete an intent (delete all incoming connectors)
delete an action (delete all outgoing connectors)
- **bug-fixed**: when rename an intent change the name of the block-contract-connector


# 1.31.0-rc.13
- **bug-fixed**: autodimension textarea onblur
- **bug-fixed**: click upload images on the whole div

# 1.31.0-rc.12
- **bug-fixed**: view voice icons
- **bug-fixed**: MqttClient subscription deleted on new widget message (MqttClient subscription only when open widget)
- **bug-fixed**: upload images
- **bug-fixed**: click upload images on the whole div
- **changed**: commented cds-changelog
- **changed**: increased minimum number of lines in json body


# 1.31.0-rc.11
- **bug-fixed**: update intent on change textarea
- **bug-fixed**: deleted log APP-COMP appconfig


# 1.31.0-rc.10
- **added**: action flow log


# 1.31.0-rc.9
- **bug-fixed**: bug fixed connect ws widget


# 1.31.0-rc.8
- **changed**: added auto scroll to bottom in logpanel


# 1.31.0-rc.7
- **added**: bug fixed chatlog webhook


# 1.31.0-rc.6
- **changed**: refactored textarea


# 1.31.0-rc.5
- **bug-fixed**: bug fixed select model Ai
- **changed**: web request changed json body from {{attribute}} to {{attribute | json}}


# 1.31.0-rc.4
- **added**: added lazy loading icons


# 1.31.0-rc.3
- **bug-fixed**: css center label in contract connector
- **changed**: chaged max_token in ai actions
- **changed**: open Advanced if they are valued in "Set attribute" action

# 1.31.0-rc.2
- **bug-fixed**: autocomplete panel dismissed when clicking on variables button
- **bug-fixed**: added models ollama


# 1.31.0-rc.1
- **added**: Ollama AI type and select custom models
- **canged**: select AI model with autocomplete


# 1.30.4
- **changed**: added LLM Ollama and changed template selection from select to input with autocomplete

# 1.30.3
- **bug-fixed**: css text-align and font-size in ng-select
- **bug-fixed**: added cds-select onReset in operand cds-action-assign-variable-v2

# 1.30.2
- **bug-fixed**: deleted log widget

# 1.30.1
- **bug-fixed**: fixed ExpressionChangedAfterItHasBeenCheckedError

# 1.30.0
- **changed**: Hide examples button if text exists in JSON buttons
- **bug-fixed**: Fixed graphic errors examples button in JSON buttons
- **bug-fixed**: Fixed logic example in JSON buttons
- **bug-fixed**: Fixed graphic errors in JSON buttons
- **added**: JSON buttons models
- **added**: more info JSON buttons
- **bug-fixed**: disabled JSON.parse in action jsonbuttons
- **added**: added json buttons
- **canged**: Hide examples button if text exists in JSON buttons
- **bug-fixed**: Fixed graphic errors examples button in JSON buttons 


# 1.29.2

# 1.29.1
- **added**: deepseek-chat llm model and claude 3.7
- **removed**: mixtral-8x7b-32768 model

# 1.29.2

# 1.29.1
- **added**: deepseek-chat llm model and claude 3.7
- **removed**: mixtral-8x7b-32768 model


# 1.30.0-rc.9
- **canged**: Hide examples button if text exists in JSON buttons

# 1.30.0-rc.8
- **bug-fixed**: Fixed graphic errors examples button in JSON buttons 
- **bug-fixed**: Fixed logic example in JSON buttons 
- **bug-fixed**: Fixed errors explode row in widget log
- **bug-fixed**: scroll to bottom in widget log

# 1.30.0-rc.7
- **bug-fixed**: Fixed graphic errors in JSON buttons 

# 1.30.0-rc.6
- **canged**: changed graphics of the log widget

# 1.30.0-rc.5
- **added**: JSON buttons models
- **added**: more info JSON buttons


# 1.30.0-rc.4
- **bug-fixed**: opacity label connector
- **bug-fixed**: show hide label connector
- **bug-fixed**: hide the label when the connector is not visible
- **bug-fixed**: remove the label when I remove a connector
- **bug-fixed**: hide contracted connector when delete or change connector from panel action
- **bug-fixed**: chack show-hide connectors on all actions
- **bug-fixed**: change z-index at connector menu
- **canged**: save the state of the contracted connector in the intent json


# 1.30.0-rc.3
- **bug-fixed**: disabled JSON.parse in action jsonbuttons


# 1.30.0-rc.2
- **changed**: Webhook remove chat actions (tagAction)
- **changed**: Webhook remove training and form sentences from blocks
- **bug-fixed**: when I create a copilot webhook passing in the body copilot:true
- **bug-fixed**: in the chatbot copilot webhook check the async loop

# 1.30.0-rc.1
- **added**: added json buttons
- **changed**: hide Button typing alias in action reply

# 1.30.0-rc.0
- **added**: hide/show single connector
- **bug-fixed**: web request 
- **changed**: change default intent color 

# 1.29.0-rc.15
- **bug-fixed**: new set thereIsWebResponse on createWebhook

# 1.29.0-rc.14
- **bug-fixed**: set thereIsWebResponse on createWebhook

# 1.29.0-rc.13
- **bug-fixed**: select default intent by subtype

# 1.29.0-rc.12
- **bug-fixed**: webhook css + services

# 1.29.0-rc.11
- **added**: new webhook

# 1.29.0-rc.3
- **changed**: web-response action UI improvements

# 1.29.0-rc.2
- **added**: web-response action

# 1.29.0-rc.1
- **added**: close intent as default internal intent for voice chatbot

# 1.28.3
- **bug-fixed**: widget into iframe not allows to use microphone

# 1.28.3-rc.1
- **bug-fixed**: widget into iframe not allows to use microphone

# 1.28.1
- **bug-fixed**: error in loadTokenMultiplier undefined value, called in CdsActionGPTTaskComponent
- **bug-fixed**: defaultfallback and start intents error to display in cds-panel-intent-list

# 1.28.1-rc.1
- **added**: create a new intent (float action menu) of the same color as the parent intent
- **bug-fixed**: fixed error in loadTokenMultiplier undefined value, called in CdsActionGPTTaskComponent
- **bug-fixed**: fix default fallback and start blocks error to display in cds-panel-intent-list

# 1.28.1
- **added**: doc for AI_PROMPT and WHATSAPP actions

# 1.28.0-rc.1
- **added**: added OpenIntentListState in local storage

# 1.28.0

# 1.28.0-rc.2
- **added**: added OpenIntentListState in local storage
- **added**: added widget log panel
- **changed**: new panel to change alpha color

# 1.28.0-rc.1
- **changed**: added sat-popover on change alpha color
- **bug-fixed**: element position start only the first time
- **bug-fixed**: cleanup of "stageService" file
- **bug-fixed**: on live test of chatbot or intent, save scale and position

# 1.27.0-rc.20
- **bug-fixed**: initStageSettings
- **bug-fixed**: set default alpha_connectors

# 1.27.0-rc.19
- **bug-fixed**: ai_prompt select image error

# 1.27.0-rc.18
- **bug-fixed**: on change scale and position in stage service

# 1.27.0-rc.17
- **bug-fixed**: connectors position on chatbot update/load/refresh

# 1.27.0-rc.16
- **bug-fixed**: answer in cds-action-ai-prompt

# 1.27.0-rc.15
- **bug-fixed**: RESERVED_INTENT_NAMES is undefined in cds-select component

# 1.27.0-rc.14
- **bug-fixed**: change the position value in localstorage when saving the zoom
- **bug-fixed**: close the color panel when I select a different intent or click a button in the options panel
- **bug-fixed**: connector alpha equal to generic connector alpha when create a new connector
- **bug-fixed**: show man icon in cds-panel-intent-list for "start" and "defaultfallback"
- **bug-fixed**: set connector alpha to 1 when mouse hover connector-out
- **bug-fixed**: Do not save or change the intent name when the name is "start" or "defaultfallback"
- **bug-fixed**: change z-index on the color panel by moving it below


# 1.27.0-rc.13
- **changed**: minor ui fix

# 1.27.0-rc.12
- **changed**: cds-action-ai UI improvements

# 1.27.0-rc.11
# 1.27.0-rc.10
- **bug-fixed**: fixed the starting position when changing scale when create a new connector
- **bug-fixed**: reset alpha color connectors when reload ds

# 1.27.0-rc.9
- **added**: cds-action-ai-prompt

# 1.27.0-rc.8
- **bug-fixed**: set "action menu" position inside stage
- **bug-fixed**: close "action panel" when pressing outside it
- **bug-fixed**: select only one intent or action at a time

# 1.27.0-rc.7
- **bug-fixed**: "start" position 

# 1.27.0-rc.6
- **changed**: customize intent "panel controls" by intent type
- **changed**: "cds-panel-intent-list" overlayed on stage

# 1.27.0-rc.5
- **changed**: set intent selected last level on the stage (always visible)
- **bug-fixed**: "start" and "defaulFallback" names duplicate in intent list 
- **added**: added maximus parameter to LocalStorage (stores the size of the action panel)

# 1.27.0-rc.4
- **changed**: set the default connector alpha to 0.7
- **changed**: open intent detail panel only when press more button 
- **bug-fixed**: "start" and "defaulFallback" names not allowed in block rename 

# 1.27.0-rc.3
- **bug-fixed**: set delayTime to 0 on the first text message of a reply 
- **bug-fixed**: change "Prompt" whit "User question" in cds-action-askgpt-v2 
- **bug-fixed**: slug in line in cds-action-replace-bot-v3 
- **bug-fixed**: text displayed in action gpt with up to 10 prompt lines
- **bug-fixed**: set the height of text boxes in button-panel to 5 lines

# 1.27.0-rc.2
- **bug-fixed**: change connector default color and alpha  

# 1.27.0-rc.1
- **added**: added panel to change intent and connector colors

# 1.26.0-rc.14
- **added**: management for free expired plan

# 1.26.0-rc.13
- **bug-fixed**: copy and paste intent/action from different chatbots; 
- **bug-fixed**: added vertical scroll to bot details page;

# 1.26.0-rc.12
- **added**: save the stage settings to local storage and load it at startup
- **bug-fixed**: set the position to the top of the intent when the element height is greater than the stage size; 

# 1.26.0-rc.11
- **bug-fixed**: hide connector on mouseover only if alphaConnectors is 0

# 1.26.0-rc.10
- **bug-fixed**: panel-intent-header error intent_display_name
- **added**: icon boy in panel-intent-detail
- **added**: button to show/hide connectors

# 1.26.0-rc.9
- **bug-fixed**: autocompleteOption is not showed in action-replace-bot-v3

# 1.26.0-rc.8
- **added**: autocompleteOptions on blockName into action-replace-bot-v3
- **changed**: autocompleteOptions in cds-text as array label-value

# 1.26.0-rc.7
- **changed**: botName with botId in action-replace-bot-v3

# 1.26.0-rc.6
- **added**: action-replace-bot-v3

# 1.26.0-rc.5
# 1.26.0-rc.4
# 1.26.0-rc.3
- **bug-fixed**: chatbot is not correctly selected in action-replace-bot-v2

# 1.26.0-rc.2
- **bug-fixed**: action-replace-bot-v2 not pass value correctly

# 1.26.0-rc.1
- **added**: slug as chatbot property and action-replace-bot-v2 option when user select a chatbot

# 1.25.0-rc.3
- **added**: intent and chatbot only agents visibility

# 1.25.0-rc.2
- **changed**: action-record translations and default values

# 1.25.1

# 1.25.0

# 1.25.0-rc.1
 **added**: lastRecordedUrl voiceFlow flow variable for action-record
 
# 1.24.0

# 1.24.0-rc.5
- **changed**: project-utils rules

# 1.24.0-rc.4
- **added**: info for default values in action replace-bot and action capture-user-reply
- **changed**: default avatar for chatbot

# 1.24.0-rc.3
- **bug-fixed**: minor fix

# 1.24.0-rc.2
- **added**: voice-twilio action category

# 1.24.0-rc.1
- **added**: add_tags action

# 1.23.0

# 1.23.0-rc.5
- **bug-fixed**: image is not saved in [WHATSAPP RECEIVER]
- **changed**: maxRow increased askgpt-v2 and gpt-task actions

# 1.23.0-rc.4
- **added**: success/else connectors in send-whatsapp action

# 1.23.0-rc.3
- **bug-fixed**: project_id is undefined in send-whatsapp action

# 1.23.0-rc.2
- **added**: send-whatsapp action

# 1.23.0-rc.1
- **bug-fixed**: managed right/left swipe to prevend back/next page load

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

