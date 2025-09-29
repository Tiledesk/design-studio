import { AbstractControl } from "@angular/forms";
import { Intent } from "src/app/models/intent-model";
import { v4 as uuidv4 } from 'uuid';

export const preDisplayName:string  = 'untitled_block_';

export const DOCS_LINK = {
    ASKGPTV2 : { 
        namespace_as_name: { link: 'https://gethelp.tiledesk.com/', target: '_blank'},
        advanced_prompt: { link: 'https://gethelp.tiledesk.com/articles/ask-knowledge-base-and-its-role-in-building-custom-ai-agents/#advanced-context', target: '_blank' }, 
        citations: { link: 'https://gethelp.tiledesk.com/articles/ask-knowledge-base-and-its-role-in-building-custom-ai-agents/#get-contents-sources', target: '_blank' }
    }, 
    ADD_TO_KB: {
        namespace_as_name: { link: 'https://gethelp.tiledesk.com/articles/add-to-knowledge-base-action/', target: '_blank'},
    },
    GPT_TASK : {
        json_mode: { link: 'https://platform.openai.com/docs/guides/structured-outputs/json-mode', target: '_blank' }
    },
    FULFILLMENT : {
        webhook_data_model: { link: 'https://developer.tiledesk.com/resolution-bot-programming/webhook-data-model', target: '_blank' }
    },
    BOT_DETAIL: {
        chatbot_slug: { link: 'https://gethelp.tiledesk.com/articles/enhancing-conversation-flows-with-replace-bot-action/#replace-bot-using-the-chatbot-slug', target: '_blank' }
    },
    JSON_BUTTONS: {
        more_json_uttons: { link: 'https://gethelp.tiledesk.com/articles/reply-action/#json-buttons', target: '_blank'},
    },
    VOICE_SETTINGS: {
        tts_model: { link: 'https://platform.openai.com/docs/api-reference/audio/createSpeech', target: '_blank'},
        stt_model: { link: 'https://platform.openai.com/docs/api-reference/audio/createTranscription', target: '_blank'},
        voice_twilio: { link: 'https://console.twilio.com/us1/develop/voice/settings/text-to-speech?frameUrl=%2Fconsole%2Fvoice%2Ftwiml%2Ftext-to-speech%3Fx-target-region%3Dus1', target: '_blank'},
        voice_openai: { link: 'https://platform.openai.com/docs/api-reference/audio', target: '_blank'},
    },
    LIQUIDJS: {
        home: { link: 'https://liquidjs.com/tutorials/intro-to-liquid.html', target: '_blank'},
        tags: { link: 'https://liquidjs.com/tags/overview.html', target: '_blank'},
        filters: { link: 'https://liquidjs.com/filters/overview.html', target: '_blank'},
    }
}

export enum LOG_LEVELS {
    NATIVE        = 'native',
    DEBUG         = 'debug',
    INFO          = 'info',
    WARN          = 'warn',
    ERROR         = 'error'
}

export enum STAGE_SETTINGS {
    AlphaConnector = 'alpha_connectors',
    Zoom = 'zoom',
    Position = 'position',
    Maximize = 'maximize',
    openIntentListState = 'open_intent_list_state'
}

export enum RESERVED_INTENT_NAMES {
    START              = 'start',
    DEFAULT_FALLBACK   = 'defaultFallback',
    WEBHOOK            = 'webhook',
    CLOSE              = 'close'
}

export enum INTENT_COLORS {
    // COLOR0 = '110,134,191',
    // COLOR1 = '80,100,147',
    COLOR1 = '156,163,205',
    COLOR2 = '61,130,226',
    COLOR3 = '86,179,101',
    COLOR4 = '204,68,75',
    COLOR5 = '210,130,40',
    COLOR6 = '182,139,206'
  }

export enum SIDEBAR_PAGES {
    INTENTS         = 'cds-sb-intents',
    SETTINGS        = 'cds-sb-settings',
    // FULFILLMENT  = 'cds-sb-fulfillment',
    PUBLISH_HISTORY = 'cds-sb-publish-history',
    RULES           = 'cds-sb-rules',
    GLOBALS         = 'cds-sb-globals',
    SUPPORT         = 'cds-sb-support'
}

export enum SETTINGS_SECTION {
    DETAIL          = 'bot_detail',
    VOICE_SETTINGS  = 'voice_settings',
    IMPORT_EXPORT   = 'export',
    COMMUNITY       = 'community',
    DEVELOPER       = 'developer',
    ADVANCED        = 'advanced'
}

export enum EXTERNAL_URL {
    getchatbotinfo = "https://tiledesk.com/community/getchatbotinfo/chatbotId/",
    getFulFillMentDoc = 'https://developer.tiledesk.com/resolution-bot-programming/webhook-data-model',
    getChangelogUrl = 'https://feedback.tiledesk.com/changelog'
}

export enum TYPE_INTENT_NAME {
    TOPIC_INTERNAL     = "internal",
    START              = "start",
    DEFAULT_FALLBACK   = "defaultFallback",
    WEBHOOK            = 'webhook',
    CLOSE              = "close"
}

export enum TYPE_MATH_OPERATOR {
    addAsNumber         = "addAsNumber",
    addAsString         = "addAsString",
    subtractAsNumber    = "subtractAsNumber",
    multiplyAsNumber    = "multiplyAsNumber",
    divideAsNumber      = "divideAsNumber"
}

export enum TYPE_FUNCTION_VAR {
    upperCaseAsString   = "upperCaseAsString",
    lowerCaseAsString   = "lowerCaseAsString",
    capitalizeAsString  = "capitalizeAsString",
    absAsNumber         = "absAsNumber",
    ceilAsNumber        = "ceilAsNumber",
    convertToNumber     = "convertToNumber",
    floorAsNumber       = "floorAsNumber",
    roundAsNumber       = "roundAsNumber",
    JSONparse           = 'JSONparse',
    JSONstringify       = 'JSONstringify'
}

export enum TYPE_FUNCTION_FUNC {
    isOpenNowAsStrings       = "openNow",
    availableAgentsAsStrings = "availableAgents"
}


export enum TYPE_INTENT_ELEMENT {
    QUESTION        = 'question',
    RESPONSE        = 'response',
    FORM            = 'form',
    ACTION          = 'action',
    ANSWER          = 'answer'
}

export enum TYPE_RESPONSE {
    TEXT        = 'text',
    RANDOM_TEXT = 'randomText',
    IMAGE       = 'image',
    FORM        = 'form',
    VIDEO       = 'video'
}

export enum TYPE_BUTTON {
    TEXT    = 'text',
    URL     = 'url',
    ACTION  = 'action'
}

export enum TYPE_URL {
    BLANK   = 'blank',
    PARENT  = 'parent',
    SELF    = 'self'
}

export enum TYPE_COMMAND {
    WAIT        = 'wait',
    MESSAGE     = 'message',
    SETTINGS    = 'settings'
}

export enum TYPE_MESSAGE {
    TEXT        = 'text',
    IMAGE       = 'image',
    FRAME       = 'frame',
    GALLERY     = 'gallery',
    REDIRECT    = 'redirect',
    AUDIO       = 'audio'
}

export enum TYPE_EVENT_CATEGORY {
    TRIGGER     = 'trigger',
    RULE        = 'rule'
}

export enum TYPE_OPERATOR {
    equalAsNumbers          = "equalAsNumbers",
    equalAsStrings          = "equalAsStrings",
    notEqualAsNumbers       = "notEqualAsNumbers",
    notEqualAsStrings       = "notEqualAsStrings",
    greaterThan             = "greaterThan",
    greaterThanOrEqual      = "greaterThanOrEqual",
    lessThan                = "lessThan",
    lessThanOrEqual         = "lessThanOrEqual",
    startsWith              = "startsWith",
    notStartsWith           = 'notStartsWith',
    startsWithIgnoreCase    = "startsWithIgnoreCase",
    contains                = "contains",
    containsIgnoreCase      = "containsIgnoreCase",
    endsWith                = "endsWith",
    isEmpty                 = "isEmpty",
    isNull                  = "isNull",
    isUndefined             = "isUndefined",
    matches                 = "matches"
}

export enum TYPE_ATTACHMENT {
    TEMPLATE = "template"
}

export enum TYPE_METHOD_ATTRIBUTE {
    TEXT    = 'text',
    INPUT   = 'input'
}

export enum TYPE_OF_MENU {
    EVENT       = 'event',
    BLOCK       = 'block',
    ACTION      = 'action',
    FORM        = 'form',
    QUESTION    = 'question'
}


export enum TYPE_UPDATE_ACTION {
    CONNECTOR   = 'connector',
    ACTION      = 'action',
    INTENT      = 'intent',
}

export enum OPTIONS {
    ZOOM_IN     = 'zoom-in',
    ZOOM_OUT    = 'zoom-out',
    CENTER      = 'center',
    UNDO        = 'undo',
    REDO        = 'redo',
    MOUSE       = 'mouse',
    ALPHA       = 'alpha'
}

export const TYPE_GPT_MODEL: Array<{name: string, value: string, description: string, status: "active" | "inactive"}> = [
    { name: "GPT-4.1",                          value: "gpt-4.1",               description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive"  },
    { name: "GPT-4.1 mini",                     value: "gpt-4.1-mini",          description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive"  },
    { name: "GPT-4.1 nano",                     value: "gpt-4.1-nano",          description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive"  },
    { name: "GPT-4o",                           value: "gpt-4o",                description: "TYPE_GPT_MODEL.gpt-4o.description",                   status: "active"    },
    { name: "GPT-4o mini",                      value: "gpt-4o-mini",           description: "TYPE_GPT_MODEL.gpt-4o-mini.description",              status: "active"    },
    { name: "GPT-4 (Legacy)",                   value: "gpt-4",                 description: "TYPE_GPT_MODEL.gpt-4.description",                    status: "active"    },
    { name: "GPT-4 Turbo Preview",              value: "gpt-4-turbo-preview",   description: "TYPE_GPT_MODEL.gpt-4-turbo-preview.description",      status: "active"    },
    { name: "GPT-3 (DaVinci)",                  value: "text-davinci-003",      description: "TYPE_GPT_MODEL.text-davinci-003.description",         status: "inactive"  },
    { name: "GPT-3.5 Turbo",                    value: "gpt-3.5-turbo",         description: "TYPE_GPT_MODEL.gpt-3.5-turbo.description",            status: "active"    },
    { name: "OpenAI o1-mini",                   value: "o1-mini",               description: "TYPE_GPT_MODEL.o1-mini.description",                  status: "inactive"    },
    { name: "OpenAI o1-preview",                value: "o1-preview",            description: "TYPE_GPT_MODEL.o1-preview.description",               status: "inactive"    }
]


export const INTENT_TEMP_ID         = '';
export const MESSAGE_METADTA_WIDTH  = '100%';
export const MESSAGE_METADTA_HEIGHT = 230;
export const TIME_WAIT_DEFAULT      = 500;
export const TEXT_CHARS_LIMIT       = 10000;//1024;
export const classCardButtonNoClose = 'card-buttons-no-close';

export const CDS_SIDEBAR_WIDTH = 60;
export const CDS_PANEL_INTENT_LIST_WIDTH = 230;
export const CDS_ADD_ACTION_MENU_WIDTH = 270;
export const DEFAULT_ALPHA_CONNECTORS = 50;




export function calculatingRemainingCharacters(text: string, limit: number): number {
    if (text) {
        let numCharsText = text.length;
        let leftCharsText = limit - numCharsText;
        return leftCharsText;
    } else {
        return limit
    }
}

export const INTENT_ELEMENT = {
    FORM:       { name: 'Form',     type: TYPE_INTENT_ELEMENT.FORM,     src: "assets/images/form.svg", description: "Add a Form to ask user data"   },
    QUESTION:   { name: 'Question', type: TYPE_INTENT_ELEMENT.QUESTION, src: "assets/images/form.svg", description: "Add a Question"                },
    // ANSWER: { name: 'Answer', type: TYPE_INTENT_ELEMENT.ANSWER, src: "assets/images/form.svg", description: "Add an Answer"},
}


export const EVENTS_LIST = {
    TRIGGER:    { name: 'Trigger',  type: TYPE_EVENT_CATEGORY.TRIGGER,  src: "assets/images/events/trigger.svg" },
    RULE:       { name: 'Rule',     type: TYPE_EVENT_CATEGORY.RULE,     src: "assets/images/events/rule.svg"    },
}

export const OPERATORS_LIST: { [key: string]: { name: string, type: TYPE_OPERATOR, src?: string } } = {
    "equalAsNumbers":           { name: "CDSOperatorList.equalAsNumbers",                   type: TYPE_OPERATOR.equalAsNumbers,                 src: "assets/images/operators/equal.svg"        },
    "equalAsStrings":           { name: "CDSOperatorList.equalAsStrings",                   type: TYPE_OPERATOR.equalAsStrings,                 src: "assets/images/operators/equal.svg"        },
    "notEqualAsNumbers":        { name: "CDSOperatorList.notEqualAsNumbers",                type: TYPE_OPERATOR.notEqualAsNumbers,              src: "assets/images/operators/not-equal.svg"    },
    "notEqualAsStrings":        { name: "CDSOperatorList.notEqualAsStrings",                type: TYPE_OPERATOR.notEqualAsStrings,              src: "assets/images/operators/not-equal.svg"    },
    "greaterThan":              { name: "CDSOperatorList.greaterThan",                      type: TYPE_OPERATOR.greaterThan,                    src: "assets/images/operators/grather.svg"      },
    "greaterThanOrEqual":       { name: "CDSOperatorList.greaterThanOrEqual",               type: TYPE_OPERATOR.greaterThanOrEqual,             src: "assets/images/operators/gratherEqual.svg" },
    "lessThan":                 { name: "CDSOperatorList.lessThan",                         type: TYPE_OPERATOR.lessThan,                       src: "assets/images/operators/less.svg"         },
    "lessThanOrEqual":          { name: "CDSOperatorList.lessThanOrEqual",                  type: TYPE_OPERATOR.lessThanOrEqual,                src: "assets/images/operators/lessEqual.svg"    },
    "startsWith":               { name: "CDSOperatorList.startsWith",                       type: TYPE_OPERATOR.startsWith                                                                      },
    "notStartsWith":            { name: "CDSOperatorList.notStartsWith",                    type: TYPE_OPERATOR.notStartsWith                                                                   },
    "startsWithIgnoreCase":     { name: "CDSOperatorList.startsWithIgnoreCase",             type: TYPE_OPERATOR.startsWithIgnoreCase                                                            },
    "endsWith":                 { name: "CDSOperatorList.endsWith",                         type: TYPE_OPERATOR.endsWith                                                                        },
    "contains":                 { name: "CDSOperatorList.contains",                         type: TYPE_OPERATOR.contains                                                                        },
    "containsIgnoreCase":       { name: "CDSOperatorList.containsIgnoreCase",               type: TYPE_OPERATOR.containsIgnoreCase                                                              },
    "isEmpty":                  { name: "CDSOperatorList.isEmpty",                          type: TYPE_OPERATOR.isEmpty                                                                         },
    "isNull":                   { name: "CDSOperatorList.isNull",                           type: TYPE_OPERATOR.isNull                                                                          },
    "isUndefined":              { name: "CDSOperatorList.isUndefined",                      type: TYPE_OPERATOR.isUndefined                                                                     },
    "matches":                  { name: "CDSOperatorList.matches",                          type: TYPE_OPERATOR.matches                                                                         }
}

export const TYPE_MATH_OPERATOR_LIST: { [key: string]: { name: string, type: TYPE_MATH_OPERATOR, src?: string } } = {
    "addAsNumbers":             { name: "CDSMathOperatorList.addAsNumbers",                 type: TYPE_MATH_OPERATOR.addAsNumber,               src: "assets/images/operators/add.svg"          },
    "addAsStrings":             { name: "CDSMathOperatorList.addAsStrings",                 type: TYPE_MATH_OPERATOR.addAsString,               src: "assets/images/operators/add.svg"          },
    "substractAsNumbers":       { name: "CDSMathOperatorList.substractAsNumbers",           type: TYPE_MATH_OPERATOR.subtractAsNumber,          src: "assets/images/operators/substract.svg"    },
    "multiplyAsNumbers":        { name: "CDSMathOperatorList.multiplyAsNumbers",            type: TYPE_MATH_OPERATOR.multiplyAsNumber,          src: "assets/images/operators/multiply.svg"     },
    "divideAsNumbers":          { name: "CDSMathOperatorList.divideAsNumbers",              type: TYPE_MATH_OPERATOR.divideAsNumber,            src: "assets/images/operators/divide.svg"       },
}

export const TYPE_FUNCTION_LIST_FOR_VARIABLES: { [key: string]: { name: string, type: TYPE_FUNCTION_VAR, src?: string } } = {
    "upperCaseAsStrings":       { name: "CDSFunctionListForVariable.upperCaseAsStrings",    type: TYPE_FUNCTION_VAR.upperCaseAsString,          src: "assets/images/functions/upperCase.svg"    },
    "lowerCaseAsStrings":       { name: "CDSFunctionListForVariable.lowerCaseAsStrings",    type: TYPE_FUNCTION_VAR.lowerCaseAsString,          src: "assets/images/functions/lowerCase.svg"    },
    "capitalizeAsStrings":      { name: "CDSFunctionListForVariable.capitalizeAsStrings",   type: TYPE_FUNCTION_VAR.capitalizeAsString,         src: "assets/images/functions/capitalize.svg"   },
    "absAsNumbers":             { name: "CDSFunctionListForVariable.absAsNumbers",          type: TYPE_FUNCTION_VAR.absAsNumber,                src: "assets/images/functions/abs.svg"          },
    "roundAsNumbers":           { name: "CDSFunctionListForVariable.roundAsNumbers",        type: TYPE_FUNCTION_VAR.roundAsNumber,              src: "assets/images/functions/round.svg"        },
    "floorAsNumbers":           { name: "CDSFunctionListForVariable.floorAsNumbers",        type: TYPE_FUNCTION_VAR.floorAsNumber,              src: "assets/images/functions/floor.svg"        },
    "ceilAsNumbers":            { name: "CDSFunctionListForVariable.ceilAsNumbers",         type: TYPE_FUNCTION_VAR.ceilAsNumber,               src: "assets/images/functions/ceil.svg"         },
    "convertToNumber":          { name: "CDSFunctionListForVariable.convertToNumber",       type: TYPE_FUNCTION_VAR.convertToNumber,            src: "assets/images/functions/ceil.svg"         },
    "JSONparse":                { name: "CDSFunctionListForVariable.JSONparse",             type: TYPE_FUNCTION_VAR.JSONparse,                  src: "assets/images/functions/jsonParse.svg"    },
    "JSONstringify":            { name: "CDSFunctionListForVariable.JSONstringify",         type: TYPE_FUNCTION_VAR.JSONstringify,              src: "assets/images/functions/jsonParse.svg"    },
}

export const TYPE_FUNCTION_LIST_FOR_FUNCTIONS: { [key: string]: { name: string, type: TYPE_FUNCTION_FUNC, src?: string } } = {
    "isOpenNowAsStrings":       { name: "Is open now",                                      type: TYPE_FUNCTION_FUNC.isOpenNowAsStrings,        src: ""                                         },
    "availableAgentAsStrings":  { name: "Available agents?",                                type: TYPE_FUNCTION_FUNC.availableAgentsAsStrings,  src: ""                                         },
}

export const CERTIFIED_TAGS: Array<{color: string, name: string}> = [
    { color: "#a16300",     name: "Lead-Gen" },
    { color: "#25833e",     name: "Support" }, 
    { color: "#a613ec33",   name: "Internal-Processes"}
    // { color: "#00699e", name: "Pre-Sale" }, 
    // { color: "#0049bd", name: "Self-serve" }, 
]

export const BUTTON_TYPES: Array<{ label: string, value: TYPE_BUTTON }> = [
    { label: "CDSButtonTypes.text", value: TYPE_BUTTON.TEXT },
    { label: "CDSButtonTypes.url", value: TYPE_BUTTON.URL },
    { label: "CDSButtonTypes.goToBlock", value: TYPE_BUTTON.ACTION }
]

export const URL_TYPES: Array<{ label: string, value: TYPE_URL }> = [
    { label: "blank", value: TYPE_URL.BLANK },
    { label: "parent", value: TYPE_URL.PARENT },
    { label: "self", value: TYPE_URL.SELF },
]

export function OperatorValidator(control: AbstractControl): { [key: string]: boolean } | null {
    if (control.value in TYPE_OPERATOR) {
        return null;
    }
    return { invalidType: true };
}

export function getEmbedUrl(url: string) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    return (match && match[2].length === 11)
        ? 'https://www.youtube.com/embed/' + match[2]
        : url;
}


export function generateShortUID(index?) {
    let timestamp = uuidv4();
    timestamp = timestamp.replace(/-/g, "");
    // const timestamp = Date.now().toString(36)+index;
    return timestamp; // + randomChars;
}
  
export function convertJsonToArray(jsonData:any){
    const arrayOfObjs = Object.entries(jsonData).map(([key, value]) => ({ 'name': key, 'value': value }))
    return arrayOfObjs;
}

export async function isElementOnTheStage(elementId:string): Promise<any>{
    return new Promise((resolve) => {
        let intervalId = setInterval(async () => {
            const result = document.getElementById(elementId);
            if (result) {
                clearInterval(intervalId);
                resolve(result);
            }
        }, 0);
        setTimeout(() => {
            clearInterval(intervalId);
            resolve(false);
        }, 1000);
    });
}

export function removeNodesStartingWith(obj, start) {
    for (const key in obj) {
        if (key.startsWith(start)) {
            delete obj[key];
        } else if (typeof obj[key] === 'object') {
            removeNodesStartingWith(obj[key], start);
        }
    }
    return obj;
}

export function insertItemInArray(array, item, pos = array.length) {
    if (pos < 0 || pos > array.length) {
      pos = array.length;
    }
    array.splice(pos, 0, item);
    return array;
}

export function replaceItemInArray(array, item, pos = array.length) {
    if (pos < 0 || pos > array.length) {
      pos = array.length;
    }
    array.splice(pos, 0, item);
    return array;
}

export function moveItemToPosition(array, DISPLAY_NAME, position) {
    if (position < 0 || position >= array.length) {
        return array;
    }
    const startIndex = array.findIndex(item => item.intent_display_name.trim() === DISPLAY_NAME);
    if (startIndex === -1 || startIndex === position) {
        return array;
    }
    const itemToMove = array[startIndex];
    array.splice(startIndex, 1);
    array.splice(position, 0, itemToMove);
    return array;
}

export function replaceItemInArrayForKey(key, array, item) {
    array.forEach(function(obj, index) {
        if (obj.hasOwnProperty(key) && obj[key] === item[key]) {
          array[index] = item;
          return;
        }
    });
    // for (let i = 0; i < array.length; i++) {
    //     if (array[i][key] === keyValue) {
    //       array[i] = item;
    //       i=array.length;
    //     }
    // }
    return array;
}

export function deleteItemInArrayForKey(key, array, item) {
    return array.filter((obj: any) => obj[key] !== item[key]);
    // let keyValue = item[key];
    // for (let i = 0; i < array.length; i++) {
    //     if (array[i][key] === keyValue) {
    //       delete array[i];
    //       i=array.length;
    //     }
    // }
    // return array;
}


export function checkInternalIntent(intent: Intent): boolean {
    return (Object.values(TYPE_INTENT_NAME)as string[]).includes(intent.intent_display_name);
}


export function findFreeId (array, key) {
    const sortedArray = array
      .map((item) => +item[key]) // tranform string to number
      .filter((value)=> !Number.isNaN(value)) //removes Null
      .slice() // Make a copy of the array.
      .sort(function (a, b) { return a - b }); // Sort it.
    let previousId = -1;
    for (let element of sortedArray) {
      if (element != (previousId + 1)) {
        // Found a gap.
        return previousId + 1;
      }
      previousId = element;
    }
    // Found no gaps.
    return previousId + 1;
  }

export function scaleAndcenterStageOnCenterPosition(listOfIntents: Intent[]){
    let arrayCoord = [];
    listOfIntents.forEach(intent => {
        const element = document.getElementById(intent.intent_id);
        arrayCoord.push({maxX:element.offsetLeft+element.offsetWidth, minX:element.offsetLeft, maxY:element.offsetTop+element.offsetHeight, minY:element.offsetTop});
    });
    var maxX = Math.max(...arrayCoord.map(obj => obj.maxX));
    var minX = Math.min(...arrayCoord.map(obj => obj.minX));
    var maxY = Math.max(...arrayCoord.map(obj => obj.maxY));
    var minY = Math.min(...arrayCoord.map(obj => obj.minY));
    
    const padding = 100
    var width = (maxX - minX)+ padding;
    var height = (maxY - minY) + padding;
    const stage = document.getElementById('tds_container').getBoundingClientRect()
    var scale = Math.min(stage.width / width, stage.height / height);
    
    width = width*scale;
    height = height*scale;
    
    let centerPointX = (minX + (maxX-minX)/2)*scale;
    let centerPointY = (minY + (maxY-minY)/2)*scale;
    
    return { point: { x: centerPointX, y: centerPointY }, scale: scale }
}

export function checkAcceptedFile(fileType, fileUploadAccept ): boolean{
  
    if (fileUploadAccept === '*/*' || !fileUploadAccept) {
      return true;
    }
    // Dividi la stringa fileUploadAccept in un array di tipi accettati
    const acceptedTypes = fileUploadAccept.split(',');
  
    // Verifica se il tipo di file è accettato
    return acceptedTypes.some((accept) => {
        accept = accept.trim();
        // Controlla per i tipi MIME con wildcard, come image/*
        if (accept.endsWith('/*')) {
            const baseMimeType = fileType.split('/')[0]; // Ottieni la parte principale del MIME type
            return accept.replace('/*', '') === baseMimeType;
        }

        // Controlla se l'accettazione è un MIME type esatto (come image/jpeg)
        if (accept === fileType) {
            return true;
        }

        // Controlla per le estensioni di file specifiche come .pdf o .txt
        return fileType === getMimeTypeFromExtension(accept);
    });
  
}
  
function getMimeTypeFromExtension(extension: string): string {
    // Rimuovi il punto dall'estensione e ottieni il MIME type
    const mimeTypes: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.wav' : 'audio/wav'
        // Aggiungi altri tipi MIME se necessario
    };
    return mimeTypes[extension] || '';
}

export function filterImageMimeTypesAndExtensions(fileUploadAccept: string): string[] {
    if (fileUploadAccept === '*/*' || !fileUploadAccept) {
        return ['*/*']
    }
    // Lista delle estensioni di immagine comuni
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    // Dividi la stringa in un array di tipi accettati
    const acceptedTypes = fileUploadAccept.split(',');
    // Filtra solo i MIME type che iniziano con "image/" o che sono estensioni di immagine
    const imageTypesAndExtensions = acceptedTypes
      .map(type => type.trim().toLowerCase()) // Rimuove gli spazi bianchi e converte a minuscolo
      .filter(type => type.startsWith('image/') || imageExtensions.includes(type));
    return imageTypesAndExtensions;
}


export function getOpacityFromRgba(rgba) {
    const rgbaRegex = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(\d*\.?\d+)\s*\)$/;
    const match = rgba.match(rgbaRegex);
    if (match) {
        return parseFloat(match[1]);
    }
    return null;
}

export function getColorFromRgba(rgba) {
    const rgbaRegex1 = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*\d*\.?\d+\s*\)$/;
    const rgbaRegex2 = /^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/;
    let match1 = rgba.match(rgbaRegex1);
    let match2 = rgba.match(rgbaRegex2);
    if (match1) {
        const [r, g, b] = [parseInt(match1[1]), parseInt(match1[2]), parseInt(match1[3])];
        return `${r}, ${g}, ${b}`;
    } else  if (match2) {
        const [r, g, b] = [parseInt(match2[1]), parseInt(match2[2]), parseInt(match2[3])];
        return `${r}, ${g}, ${b}`;
    }
    return null;
  }