import { AbstractControl } from "@angular/forms";
import { Intent } from "src/app/models/intent-model";
import { PLAN_NAME } from "src/chat21-core/utils/constants";
import { v4 as uuidv4 } from 'uuid';

export const preDisplayName:string  = 'untitled_block_';

export enum TYPE_INTENT_NAME {
    TOPIC_INTERNAL                  = 'internal',
    DISPLAY_NAME_START              = "start",
    DISPLAY_NAME_DEFAULT_FALLBACK   = "defaultFallback",
}

export enum SIDEBAR_PAGES {
    INTENTS     = 'cds-sb-intents',
    SETTINGS    = 'cds-sb-settings',
    // FULFILLMENT = 'cds-sb-fulfillment',
    RULES       = 'cds-sb-rules',
    GLOBALS     = 'cds-sb-globals',
    SUPPORT     = 'cds-sb-support'
}

export enum SETTINGS_SECTION {
    DETAIL          = 'bot_detail',
    IMPORT_EXPORT   = 'import_export',
    COMMUNITY       = 'community',
    DEVELOPER       = 'developer'
}

export enum EXTERNAL_URL {
    getchatbotinfo = "https://tiledesk.com/community/getchatbotinfo/chatbotId/",
    getFulFillMentDoc = 'https://developer.tiledesk.com/resolution-bot-programming/webhook-data-model',
    getChangelogUrl = 'https://feedback.tiledesk.com/changelog'
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
    WAIT    = 'wait',
    MESSAGE = 'message',
}

export enum TYPE_MESSAGE {
    TEXT        = 'text',
    IMAGE       = 'image',
    FRAME       = 'frame',
    GALLERY     = 'gallery',
    REDIRECT    = 'redirect'
}

export enum TYPE_ACTION {
    REPLY               = 'reply',
    RANDOM_REPLY        = 'randomreply',
    WEB_REQUEST         = 'webrequest',
    WEB_REQUESTV2       = 'webrequestv2',
    MAKE                = 'make',
    AGENT               = 'agent',
    CLOSE               = 'close',
    EMAIL               = 'email',
    WHATSAPP_STATIC     = 'whatsapp_static',
    WHATSAPP_ATTRIBUTE  = 'whatsapp_attribute',
    WHATSAPP_SEGMENT    = 'whatsapp_segment',
    ASKGPT              = 'askgpt',
    ASKGPTV2            = "askgptv2",
    GPT_TASK            = 'gpt_task',
    WAIT                = 'wait',
    INTENT              = 'intent',
    ASSIGN_VARIABLE     = 'setattribute',
    ASSIGN_VARIABLE_V2  = 'setattribute-v2',
    ASSIGN_FUNCTION     = 'setfunction',
    DELETE_VARIABLE     = 'delete',
    REPLACE_BOT         = 'replacebot',
    REPLACE_BOTV2       = 'replacebotv2',
    CHANGE_DEPARTMENT   = 'department',
    ONLINE_AGENTS       = 'ifonlineagents',
    OPEN_HOURS          = 'ifopenhours',
    HIDE_MESSAGE        = 'hmessage',
    JSON_CONDITION      = 'jsoncondition',
    CONDITION           = 'condition',
    CAPTURE_USER_REPLY  = 'capture_user_reply',
    QAPLA               = "qapla",
    HUBSPOT             = 'hubspot',
    CODE                = 'code'
}

export enum TYPE_ACTION_CATEGORY {
    MOST_USED       = 'Most Used',
    FLOW            = 'Flow',
    INTEGRATIONS    = 'Integrations',
    SPECIAL         = 'Special',
    NEW             = 'New'
}

export enum TYPE_EVENT_CATEGORY {
    TRIGGER     = 'trigger',
    RULE        = 'rule'
}

export const ACTION_CATEGORY =[
    { type: getKeyByValue(TYPE_ACTION_CATEGORY.MOST_USED, TYPE_ACTION_CATEGORY),    name: 'CDSActionCategory.MostUsed',     src: 'assets/images/actions_category/most_used.svg'},
    { type: getKeyByValue(TYPE_ACTION_CATEGORY.FLOW, TYPE_ACTION_CATEGORY),         name: 'CDSActionCategory.Flow',         src: 'assets/images/actions_category/flow.svg'},
    { type: getKeyByValue(TYPE_ACTION_CATEGORY.INTEGRATIONS, TYPE_ACTION_CATEGORY), name: 'CDSActionCategory.Integrations', src: 'assets/images/actions_category/integrations.svg'},
    { type: getKeyByValue(TYPE_ACTION_CATEGORY.SPECIAL, TYPE_ACTION_CATEGORY),      name: 'CDSActionCategory.Special',      src: 'assets/images/actions_category/special.svg'},
    // { type: getKeyByValue(TYPE_ACTION_CATEGORY.NEW, TYPE_ACTION_CATEGORY), name: TYPE_ACTION_CATEGORY.NEW, src: 'assets/images/actions_category/new.svg'}
]

export function getKeyByValue(value, keys) {
    const indexOfS = Object.values(keys).indexOf(value as unknown as any);
    const key = Object.keys(keys)[indexOfS];
    return key;
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

export enum TYPE_METHOD_REQUEST {
    GET         = 'GET', 
    POST        = 'POST', 
    PUT         = 'PUT',
    PATCH       = 'PATCH',
    DELETE      = 'DELETE', 
    COPY        = 'COPY', 
    HEAD        = 'HEAD',
    OPTIONS     = 'OPTIONS',
    LINK        = 'LINK', 
    UNLINK      = 'UNLINK', 
    PURGE       = 'PURGE',
    LOCK        = 'LOCK',
    UNLOCK      = 'UNLOCK', 
    PROPFIND    = 'PROPFIND', 
    VIEW        = 'VIEW'
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
    UNDO        = "undo",
    REDO        = "redo",
    MOUSE       = "mouse"
}

export const INTENT_TEMP_ID         = '';
export const MESSAGE_METADTA_WIDTH  = '100%';
export const MESSAGE_METADTA_HEIGHT = 230;
export const TIME_WAIT_DEFAULT      = 500;
export const TEXT_CHARS_LIMIT       = 1024;
export const classCardButtonNoClose = 'card-buttons-no-close';



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


export const ACTIONS_LIST: {[key: string]: {name: string, category: TYPE_ACTION_CATEGORY, type: TYPE_ACTION, src: string, status: 'active' | 'inactive' | 'beta', plan?: PLAN_NAME, description?: string, disabled?: boolean}}= {
    REPLY :                 { name: 'CDSActionList.NAME.Reply',                 category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.REPLY,                src:"assets/images/actions/reply.svg",                  status: "active" ,                      description: "CDSActionList.DESCRIPTION.Reply"                              },
    RANDOM_REPLY :          { name: 'CDSActionList.NAME.RandomReply',           category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.RANDOM_REPLY,         src:"assets/images/actions/random_reply.svg",           status: "active",                       description: "CDSActionList.DESCRIPTION.RandomReply"                        },
    AGENT :                 { name: 'CDSActionList.NAME.AgentHandoff',          category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.AGENT,                src:"assets/images/actions/agent_handoff.svg",          status: "active",                       description: "CDSActionList.DESCRIPTION.AgentHandoff"                       },
    CLOSE :                 { name: 'CDSActionList.NAME.Close',                 category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.CLOSE,                src:"assets/images/actions/close.svg",                  status: "active",                       description: "CDSActionList.DESCRIPTION.Close"                              },
    OPEN_HOURS:             { name: 'CDSActionList.NAME.IfOperatingHours',      category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.OPEN_HOURS,           src: "assets/images/actions/open_hours.svg",            status: "active",                       description: "CDSActionList.DESCRIPTION.IfOperatingHours"                   },
    ONLINE_AGENTS:          { name: 'CDSActionList.NAME.IfOnlineAgent',         category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.ONLINE_AGENTS,        src: "assets/images/actions/online_agents.svg",         status: "active",                       description: "CDSActionList.DESCRIPTION.IfOnlineAgent"                      },
    CONDITION:              { name: 'CDSActionList.NAME.Condition',             category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.CONDITION,            src: "assets/images/actions/condition.svg",             status: "active"                                                                                                    },
    JSON_CONDITION:         { name: 'CDSActionList.NAME.ConditionElse',         category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.JSON_CONDITION,       src: "assets/images/actions/condition.svg",             status: "active"                                                                                                    },
    INTENT :                { name: 'CDSActionList.NAME.ConnectBlock',          category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.INTENT,               src:"assets/images/actions/connect_intent.svg",         status: "inactive",                     description: "CDSActionList.DESCRIPTION.ConnectBlock"                       },
    ASSIGN_VARIABLE:        { name: 'CDSActionList.NAME.SetAttribute',          category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.ASSIGN_VARIABLE,      src: "assets/images/actions/assign_var.svg",            status: "inactive"                                                                                                  },
    ASSIGN_VARIABLE_V2:     { name: 'CDSActionList.NAME.SetAttribute',          category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.ASSIGN_VARIABLE_V2,   src: "assets/images/actions/assign_var.svg",            status: "active"                                                                                                    },
    DELETE_VARIABLE:        { name: 'CDSActionList.NAME.DeleteAttribute',       category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.DELETE_VARIABLE,      src: "assets/images/actions/delete_var.svg",            status: "active",                                                                                                   },
    REPLACE_BOT:            { name: 'CDSActionList.NAME.ReplaceBot',            category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.REPLACE_BOT,          src: "assets/images/actions/replace_bot.svg",           status: "inactive",                     description: "CDSActionList.DESCRIPTION.ReplaceBot"                         },
    REPLACE_BOTV2:          { name: 'CDSActionList.NAME.ReplaceBot',            category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.REPLACE_BOTV2,        src: "assets/images/actions/replace_bot.svg",           status: "active",                       description: "CDSActionList.DESCRIPTION.ReplaceBot"                         },
    WAIT :                  { name: 'CDSActionList.NAME.Wait',                  category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.WAIT,                 src:"assets/images/actions/wait.svg",                   status: "active",                       description: "CDSActionList.DESCRIPTION.Wait"                               },
    // WEB_REQUEST : { name: 'CDSActionList.NAME.WebRequest',category: TYPE_ACTION_CATEGORY.INTEGRATIONS, type: TYPE_ACTION.WEB_REQUEST, src:"assets/images/actions/web_request.svg", status: "active", description: ''},
    WEB_REQUESTV2 :         { name: 'CDSActionList.NAME.WebRequest',            category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.WEB_REQUESTV2,        src:"assets/images/actions/web_request.svg",            status: "beta",                         description: ''                                                             },
    EMAIL :                 { name: 'CDSActionList.NAME.SendEmail',             category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.EMAIL,                src:"assets/images/actions/send_email.svg",             status: "active",                       description: "CDSActionList.DESCRIPTION.SendEmail"                          },
    WHATSAPP_STATIC:        { name: 'CDSActionList.NAME.WhatsAppStatic',        category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.WHATSAPP_STATIC,      src: "assets/images/actions/whatsapp.svg",              status: "active",                       description: "CDSActionList.DESCRIPTION.WhatsAppStatic"                     },
    WHATSAPP_ATTRIBUTE:     { name: 'CDSActionList.NAME.WhatsAppByAttribute',   category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.WHATSAPP_ATTRIBUTE,   src: "assets/images/actions/whatsapp.svg",              status: "active",                       description: "CDSActionList.DESCRIPTION.WhatsAppByAttribute"                },
    // WHATSAPP_SEGMENT: { name: 'CDSActionList.NAME.WhatsAppBySegment', category: TYPE_ACTION_CATEGORY.INTEGRATIONS, type: TYPE_ACTION.WHATSAPP_SEGMENT, src: "assets/images/actions/whatsapp.svg", status: "active", description: "CDSActionList.DESCRIPTION.WhatsAppBySegment" },
    ASKGPT:                 { name: 'CDSActionList.NAME.AskTheKnowledgeBase',   category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.ASKGPT,               src: "assets/images/actions/ask_to_kb.svg",             status: "active",                     description: "CDSActionList.DESCRIPTION.AskTheKnowledgeBase"                },
    ASKGPTV2:               { name: 'CDSActionList.NAME.AskTheKnowledgeBaseV2',   category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.ASKGPTV2,             src: "assets/images/actions/ask_to_kb.svg",             status: "active",                       description: "CDSActionList.DESCRIPTION.AskTheKnowledgeBase"                },
    GPT_TASK:               { name: 'CDSActionList.NAME.GPTTask',               category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.GPT_TASK,             src: "assets/images/actions/openai-icon.svg",           status: "active",                       description: "CDSActionList.DESCRIPTION.GPTTask"                            },
    HIDE_MESSAGE:           { name: 'CDSActionList.NAME.HiddenMessage',         category: TYPE_ACTION_CATEGORY.SPECIAL,             type: TYPE_ACTION.HIDE_MESSAGE,         src: "assets/images/actions/hidden_message.svg",        status: "active"                                                                                                    },
    CHANGE_DEPARTMENT:      { name: 'CDSActionList.NAME.ChangeDept',            category: TYPE_ACTION_CATEGORY.SPECIAL,             type: TYPE_ACTION.CHANGE_DEPARTMENT,    src: "assets/images/actions/change_department.svg",     status: "active"                                                                                                    },
    CODE :                  { name: 'CDSActionList.NAME.Code',                  category: TYPE_ACTION_CATEGORY.SPECIAL,             type: TYPE_ACTION.CODE,                 src:"assets/images/actions/code.svg",                   status: "active", plan: PLAN_NAME.F,    description: '',                                            disabled: false },
    // ASSIGN_FUNCTION: { name: 'CDSActionList.NAME.SetFunction', category: TYPE_ACTION_CATEGORY.NEW, type: TYPE_ACTION.ASSIGN_FUNCTION, src: "assets/images/actions/assign_var.svg" },
    CAPTURE_USER_REPLY:     { name: 'CDSActionList.NAME.CaptureUserReply',      category: TYPE_ACTION_CATEGORY.FLOW, type: TYPE_ACTION.CAPTURE_USER_REPLY,                  src: "assets/images/actions/capture_user_reply.svg",    status: "active",                       description: "CDSActionList.DESCRIPTION.CaptureUserReply"                   },
    QAPLA:                  { name: 'CDSActionList.NAME.Qapla',                 category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.QAPLA,                src: "assets/images/actions/qapla.svg",                 status: "active", plan: PLAN_NAME.E,    description: "CDSActionList.DESCRIPTION.Qapla",             disabled: false },
    MAKE :                  { name: 'CDSActionList.NAME.Make',                  category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.MAKE,                 src:"assets/images/actions/make.svg",                   status: "active", plan: PLAN_NAME.D,    description: '',                                            disabled: false },
    HUPSPOT :               { name: 'CDSActionList.NAME.Hubspot',               category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.HUBSPOT,              src:"assets/images/actions/hubspot.svg",                status: "active", plan: PLAN_NAME.E,    description: ''                                                             },
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
    "JSONparse":                { name: "JSON.parse",                                       type: TYPE_FUNCTION_VAR.JSONparse,                  src: "assets/images/functions/jsonParse.svg"    },
    "JSONstringify":            { name: "JSON.stringify",                                   type: TYPE_FUNCTION_VAR.JSONstringify,              src: "assets/images/functions/jsonParse.svg"    },
}

export const TYPE_FUNCTION_LIST_FOR_FUNCTIONS: { [key: string]: { name: string, type: TYPE_FUNCTION_FUNC, src?: string } } = {
    "isOpenNowAsStrings":       { name: "Is open now",                                      type: TYPE_FUNCTION_FUNC.isOpenNowAsStrings,        src: ""                                         },
    "availableAgentAsStrings":  { name: "Available agents?",                                type: TYPE_FUNCTION_FUNC.availableAgentsAsStrings,  src: ""                                         },
}

export const CERTIFIED_TAGS: Array<{color: string, name: string}> = [
    { color: "#a16300", name: "Lead-Gen" },
    { color: "#25833e", name: "Support" }, 
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

// export var variableList: { [key: string]: {label: string, elements: Array<any>}} = {
//     userDefined: {
//         label: 'User defined',
//         elements: []
//     },
//     mostUsed: {
//         label: 'Most used',
//         elements: [
//             { name: 'last_user_text', value: 'last_user_text', description: 'The last text the user typed. This is overwritten on each user reply', src: '', icon: 'send' },
//             { name: 'user_country', value: 'user_country', description: 'The user Country as decoded by Tiledesk',src: '', icon: 'language' },
//             { name: 'user_city', value: 'user_city', description: 'The user City as decoded by Tiledesk', src: '', icon: 'language' },
//             { name: 'user_language', value: 'user_language', description: 'The user language decoded on channel', src: '', icon: 'language' },
//             { name: 'transcript', value: 'transcript', description: 'All the conversation messages exchanged with this chatbot during the chat', src: '', icon: 'description'},
//         ]
//     },
//     systemDefined: {
//         label: 'System defined',
//         elements: [
//             { name: 'department_id', value: 'department_id', description: 'The ID of the department where this chatbot is activated', src: '', icon: 'domain' },
//             { name: 'department_name', value: 'department_name', description: 'The name of the department where this chatbot is activated', src: '', icon: 'domain' },
//             { name: 'project_id', value: 'project_id', description: 'The name of the project where this chatbot belongs to', src: '', icon: 'domain' },
//             { name: 'last_message_id', value: 'last_message_id', description: 'The unique ID of the last message sent', src: '', icon: 'textsms' },
//             { name: 'conversation_id', value: 'conversation_id', description: 'This conversation unique ID', src: '', icon: 'textsms' },
//             { name: 'chatbot_name', value: 'chatbot_name', description: 'This chatbot name', src: '', icon: 'person' },
//             { name: 'user_id', value: 'user_id', description: 'The user unique ID inside Tiledesk database', src: '', icon: 'person' },
//             { name: 'user_agent', value: 'user_agent', description: 'The web user agent where this conversation initiated', src: '', icon: 'person' },
//             { name: 'chatChannel', value: 'chatChannel', description: 'The channel where this conversation belongs to. Ex. "web", "whatsapp", "facebook", "telegram"', src: '', icon: 'language' },
//             { name: 'user_source_page', value: 'user_source_page', description: 'The page where this conversations is runinng. Only available on channel "web"', src: '', icon: 'language' },
//             { name: 'chat_url', value: 'chat_url', description: 'The url of the Chat to send to a colleague to chat with this user. Use "Invite human" action to invite the human to this chat.', src: '', icon: 'laptop' },
//             { name: 'user_ip_address', value: 'user_ip_address', description: 'The user IP address, when available',src: '', icon: 'laptop' },
//         ]
//     },
//     uploadedDocument: {
//         label: 'Uploaded document',
//         elements: [
//             { name: 'lastUserDocumentURL', value: 'lastUserDocumentURL', description: 'The public URL to access the document uploaded by the user. It\'s empy if no document is uploaded', src: '', icon:'upload_file'},
//             { name: 'lastUserDocumentName', value: 'lastUserDocumentName', description: 'The name of the document uploaded by the user. It\'s empy if no document is uploaded', src: '', icon:'upload_file'},
//             { name: 'lastUserDocumentType', value: 'lastUserDocumentType', description: 'The type of the document uploaded by the user. It\'s empy if no document is uploaded', src: '', icon:'upload_file'},
//         ]
//     },
//     uploadedImage: {
//         label: 'Uploaded image',
//         elements: [
//             { name: 'lastUserImageURL', value: 'lastUserImageURL', description: 'The public URL to access the image uploaded by the user. It\'s empy if no image is uploaded', src: '', icon:'image'},
//             { name: 'lastUserImageName', value: 'lastUserImageName', description: 'The name of the image uploaded by the user. It\'s empy if no image is uploaded', src: '', icon:'image'},
//             { name: 'lastUserImageType', value: 'lastUserImageType', description: 'The type of the image uploaded by the user. It\'s empy if no image is uploaded', src: '', icon:'image'},
//             { name: 'lastUserImageWidth', value: 'lastUserImageWidth', description: 'The height in pixel of the image uploaded by the user. It\'s empy if no image is uploaded', src: '', icon:'image'},
//             { name: 'lastUserImageHeight', value: 'lastUserImageHeight', description: 'The wdth in pixel of the image uploaded by the user. It\'s empy if no image is uploaded', src: '', icon:'image'}
//         ]
//     }
// }

export var variableList: Array<{key: string, elements: Array<any>}> = [ 
    {
        key: 'userDefined',
        elements: []
    },
    {
        key: 'globals',
        elements: []
    },
    {
        key: 'mostUsed',
        elements: [
            { name: 'last_user_text',       value: 'last_user_text',        description: 'CDSvariablesList.mostUsedELements.last_user_text.description',                src: '', icon: 'send' },
            { name: 'user_country',         value: 'user_country',          description: 'CDSvariablesList.mostUsedELements.user_country.description',                  src: '', icon: 'language' },
            { name: 'user_city',            value: 'user_city',             description: 'CDSvariablesList.mostUsedELements.user_city.description',                     src: '', icon: 'language' },
            { name: 'user_language',        value: 'user_language',         description: 'CDSvariablesList.mostUsedELements.user_language.description',                 src: '', icon: 'language' },
            { name: 'transcript',           value: 'transcript',            description: 'CDSvariablesList.mostUsedELements.transcript.description',                    src: '', icon: 'description'},
        ]
    },
    {
        key: 'systemDefined',
        elements: [
            { name: 'department_id',        value: 'department_id',         description: 'CDSvariablesList.systemDefinedElements.department_id.description',            src: '', icon: 'domain' },
            { name: 'department_name',      value: 'department_name',       description: 'CDSvariablesList.systemDefinedElements.department_name.description',          src: '', icon: 'domain' },
            { name: 'project_id',           value: 'project_id',            description: 'CDSvariablesList.systemDefinedElements.project_id.description',               src: '', icon: 'domain' },
            { name: 'last_message_id',      value: 'last_message_id',       description: 'CDSvariablesList.systemDefinedElements.last_message_id.description',          src: '', icon: 'textsms' },
            { name: 'conversation_id',      value: 'conversation_id',       description: 'CDSvariablesList.systemDefinedElements.conversation_id.description',          src: '', icon: 'textsms' },
            { name: 'chatbot_name',         value: 'chatbot_name',          description: 'CDSvariablesList.systemDefinedElements.chatbot_name.description',             src: '', icon: 'person' },
            { name: 'user_id',              value: 'user_id',               description: 'CDSvariablesList.systemDefinedElements.user_id.description',                  src: '', icon: 'person' },
            { name: 'user_agent',           value: 'user_agent',            description: 'CDSvariablesList.systemDefinedElements.user_agent.description',               src: '', icon: 'person' },
            { name: 'chatChannel',          value: 'chatChannel',           description: 'CDSvariablesList.systemDefinedElements.chatChannel.description',              src: '', icon: 'language' },
            { name: 'user_source_page',     value: 'user_source_page',      description: 'CDSvariablesList.systemDefinedElements.user_source_page.description',         src: '', icon: 'language' },
            { name: 'chat_url',             value: 'chat_url',              description: 'CDSvariablesList.systemDefinedElements.chat_url.description',                 src: '', icon: 'laptop' },
            { name: 'user_ip_address',      value: 'user_ip_address',       description: 'CDSvariablesList.systemDefinedElements.user_ip_address.description',          src: '', icon: 'laptop' },
            { name: 'ticketId',             value: 'ticketId',              description: 'CDSvariablesList.systemDefinedElements.ticketId.description',                 src: '', icon: 'sell' },
            
        ]
    },
    {
        key: 'uploadedDocument',
        elements: [
            { name: 'lastUserDocumentURL',  value: 'lastUserDocumentURL',   description: 'CDSvariablesList.uploadedDocumentElements.lastUserDocumentURL.description',   src: '', icon:'upload_file'},
            { name: 'lastUserDocumentName', value: 'lastUserDocumentName',  description: 'CDSvariablesList.uploadedDocumentElements.lastUserDocumentName.description',  src: '', icon:'upload_file'},
            { name: 'lastUserDocumentType', value: 'lastUserDocumentType',  description: 'CDSvariablesList.uploadedDocumentElements.lastUserDocumentType.description',  src: '', icon:'upload_file'},
        ]
    },
    {   key: 'uploadedImage',
        elements: [
            { name: 'lastUserImageURL',     value: 'lastUserImageURL',      description: 'CDSvariablesList.uploadedImageElements.lastUserImageURL.description',         src: '', icon:'image'},
            { name: 'lastUserImageName',    value: 'lastUserImageName',     description: 'CDSvariablesList.uploadedImageElements.lastUserImageName.description',        src: '', icon:'image'},
            { name: 'lastUserImageType',    value: 'lastUserImageType',     description: 'CDSvariablesList.uploadedImageElements.lastUserImageType.description',        src: '', icon:'image'},
            { name: 'lastUserImageWidth',   value: 'lastUserImageWidth',    description: 'CDSvariablesList.uploadedImageElements.lastUserImageWidth.description',       src: '', icon:'image'},
            { name: 'lastUserImageHeight',  value: 'lastUserImageHeight',   description: 'CDSvariablesList.uploadedImageElements.lastUserImageHeight.description',      src: '', icon:'image'}
        ]
    },
    {   key: 'leadAttributes',
        elements: [
            { name: 'userEmail',            value: 'userEmail',             description: 'CDSvariablesList.leadAttributesElements.userEmail.description',               src: '', icon:'person'},
            { name: 'userFullname',         value: 'userFullname',          description: 'CDSvariablesList.leadAttributesElements.userFullname.description',            src: '', icon:'person'},
            { name: 'userPhone',            value: 'userPhone',             description: 'CDSvariablesList.leadAttributesElements.userPhone.description',               src: '', icon:'person'},
            { name: 'userLeadId',           value: 'userLeadId',            description: 'CDSvariablesList.leadAttributesElements.userLeadId.description',              src: '', icon:'person'},
            { name: 'userCompany',          value: 'userCompany',           description: 'CDSvariablesList.leadAttributesElements.userCompany.description',             src: '', icon:'person'},
            { name: 'currentPhoneNumber',   value: 'currentPhoneNumber',    description: 'CDSvariablesList.leadAttributesElements.currentPhoneNumber.description',      src: '', icon:'person'}
        ]
    }
]

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



export function checkInternalIntent(intent: Intent): boolean{
    return intent.intent_display_name === TYPE_INTENT_NAME.DISPLAY_NAME_START ||  intent.intent_display_name === TYPE_INTENT_NAME.DISPLAY_NAME_DEFAULT_FALLBACK ? true: false
}

export function scaleAndcenterStageOnCenterPosition(listOfIntents: Intent[]){
    let arrayCoord = [];
    listOfIntents.forEach(intent => {
        const element = document.getElementById(intent.intent_id);
        // console.log('element', intent.intent_id, element);
        arrayCoord.push({maxX:element.offsetLeft+element.offsetWidth, minX:element.offsetLeft, maxY:element.offsetTop+element.offsetHeight, minY:element.offsetTop});
    });
    var maxX = Math.max(...arrayCoord.map(obj => obj.maxX));
    var minX = Math.min(...arrayCoord.map(obj => obj.minX));
    var maxY = Math.max(...arrayCoord.map(obj => obj.maxY));
    var minY = Math.min(...arrayCoord.map(obj => obj.minY));
    // console.log('coordinate', minX, maxX, minY, maxY);
    // console.log("Coordinata x maggiore:", maxX, maxX_ );
    // console.log("Coordinata x minore:", minX, minX_);
    // console.log("Coordinata y maggiore:", maxY, maxY_);
    // console.log("Coordinata y minore:", minY, minY_);
    // let rightIntentWith = document.getElementById(listOfIntents.reduce((prev, curr)=> { return prev.attributes.position.x > curr.attributes.position.x ? prev : curr}).intent_id).offsetWidth;
    // let bottomIntentHeight = document.getElementById(listOfIntents.reduce((prev, curr)=> { return prev.attributes.position.y < curr.attributes.position.y ? prev : curr}).intent_id).offsetHeight;
    // console.log('rightIntentWith', rightIntentWith, rightIntentWith_)
    // console.log('bottomIntentHeight', bottomIntentHeight, bottomIntentHeight_)
    const padding = 100
    var width = (maxX - minX)+ padding;
    var height = (maxY - minY) + padding;
    const stage = document.getElementById('tds_container').getBoundingClientRect()
    var scale = Math.min(stage.width / width, stage.height / height);
    // console.log('scaleeeee: ', scale, (stage.width / width), (stage.height / height));
    width = width*scale;
    height = height*scale;
    // console.log('dimensione: ', width, height);
    let centerPointX = (minX + (maxX-minX)/2)*scale;
    let centerPointY = (minY + (maxY-minY)/2)*scale;
    // console.log('translateeee x- y ', translationX, translationY)
    return { point: { x: centerPointX, y: centerPointY }, scale: scale }
}