import { PLAN_NAME } from 'src/chat21-core/utils/constants';

export enum TYPE_ACTION {
    REPLY               = 'reply',
    REPLYV2             = 'replyv2',
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
    GPT_ASSISTANT       = 'gpt_assistant',
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
    ONLINE_AGENTSV2     = 'ifonlineagentsv2',
    OPEN_HOURS          = 'ifopenhours',
    HIDE_MESSAGE        = 'hmessage',
    JSON_CONDITION      = 'jsoncondition',
    CONDITION           = 'condition',
    CAPTURE_USER_REPLY  = 'capture_user_reply',
    QAPLA               = "qapla",
    HUBSPOT             = 'hubspot',
    CUSTOMERIO          = 'customerio',
    BREVO               = 'brevo',
    N8N                 = 'n8n',
    CODE                = 'code',
}

export enum TYPE_ACTION_VXML {
    DTMF_FORM           = 'dtmf_form',
    DTMF_MENU           = 'dtmf_menu',
    BLIND_TRANSFER      = 'blind_transfer',
    PLAY_PROMPT         = 'play_prompt',
    SPEECH_FORM         = 'speech_form',
}

export enum TYPE_ACTION_CATEGORY {
    MOST_USED       = 'Most Used',
    AI              = 'AI',
    FLOW            = 'Flow',
    INTEGRATIONS    = 'Integrations',
    SPECIAL         = 'Special',
    NEW             = 'New',
    VOICE           = 'Voice'
}

export const ACTION_CATEGORY =[
    { type: getKeyByValue(TYPE_ACTION_CATEGORY.MOST_USED, TYPE_ACTION_CATEGORY),    name: 'CDSActionCategory.MostUsed',     src: 'assets/images/actions_category/most_used.svg'},
    { type: getKeyByValue(TYPE_ACTION_CATEGORY.AI, TYPE_ACTION_CATEGORY),           name: 'CDSActionCategory.AI',           src: 'assets/images/actions_category/ai.svg'},
    { type: getKeyByValue(TYPE_ACTION_CATEGORY.FLOW, TYPE_ACTION_CATEGORY),         name: 'CDSActionCategory.Flow',         src: 'assets/images/actions_category/flow.svg'},
    { type: getKeyByValue(TYPE_ACTION_CATEGORY.INTEGRATIONS, TYPE_ACTION_CATEGORY), name: 'CDSActionCategory.Integrations', src: 'assets/images/actions_category/integrations.svg'},
    { type: getKeyByValue(TYPE_ACTION_CATEGORY.SPECIAL, TYPE_ACTION_CATEGORY),      name: 'CDSActionCategory.Special',      src: 'assets/images/actions_category/special.svg'},
    // { type: getKeyByValue(TYPE_ACTION_CATEGORY.VOICE, TYPE_ACTION_CATEGORY),        name: 'CDSActionCategory.Voice',        src: 'assets/images/actions_category/voice.svg'},
    // { type: getKeyByValue(TYPE_ACTION_CATEGORY.NEW, TYPE_ACTION_CATEGORY), name: TYPE_ACTION_CATEGORY.NEW, src: 'assets/images/actions_category/new.svg'}
]

export function getKeyByValue(value, keys) {
    const indexOfS = Object.values(keys).indexOf(value as unknown as any);
    const key = Object.keys(keys)[indexOfS];
    return key;
}

export const ACTIONS_LIST: {[key: string]: {name: string, category: TYPE_ACTION_CATEGORY, type: TYPE_ACTION | TYPE_ACTION_VXML, src: string, status: 'active' | 'inactive' | 'beta', plan?: PLAN_NAME, badge?: string, description?: string, doc?: string, disabled?: boolean}}= {
    REPLY :                 { name: 'CDSActionList.NAME.Reply',                 category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.REPLY,                src:"assets/images/actions/reply.svg",                  status: "active" ,                      description: "CDSActionList.DESCRIPTION.Reply",              doc: "CDSActionList.DOCS.Reply"                    },
    REPLYV2 :               { name: 'CDSActionList.NAME.ReplyV2',               category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.REPLYV2,              src:"assets/images/actions/reply_v2.svg",               status: "beta" , badge: 'NEW',          description: "CDSActionList.DESCRIPTION.ReplyV2",           doc: "CDSActionList.DOCS.ReplyV2"                  },
    RANDOM_REPLY :          { name: 'CDSActionList.NAME.RandomReply',           category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.RANDOM_REPLY,         src:"assets/images/actions/random_reply.svg",           status: "active",                       description: "CDSActionList.DESCRIPTION.RandomReply"                                                            },
    AGENT :                 { name: 'CDSActionList.NAME.AgentHandoff',          category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.AGENT,                src:"assets/images/actions/agent_handoff.svg",          status: "active",                       description: "CDSActionList.DESCRIPTION.AgentHandoff"                                                           },
    CLOSE :                 { name: 'CDSActionList.NAME.Close',                 category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.CLOSE,                src:"assets/images/actions/close.svg",                  status: "active",                       description: "CDSActionList.DESCRIPTION.Close"                                                                  },
    OPEN_HOURS:             { name: 'CDSActionList.NAME.IfOperatingHours',      category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.OPEN_HOURS,           src: "assets/images/actions/open_hours.svg",            status: "active",                       description: "CDSActionList.DESCRIPTION.IfOperatingHours"                                                       },
    ONLINE_AGENTS:          { name: 'CDSActionList.NAME.IfOnlineAgent',         category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.ONLINE_AGENTS,        src: "assets/images/actions/online_agents.svg",         status: "inactive",                     description: "CDSActionList.DESCRIPTION.IfOnlineAgent"                                                          },
    ONLINE_AGENTSV2:        { name: 'CDSActionList.NAME.IfOnlineAgent',         category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.ONLINE_AGENTSV2,      src: "assets/images/actions/online_agents.svg",         status: "active", badge: 'NEW',         description: "CDSActionList.DESCRIPTION.IfOnlineAgent"                                                          },
    CONDITION:              { name: 'CDSActionList.NAME.Condition',             category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.CONDITION,            src: "assets/images/actions/condition.svg",             status: "active"                                                                                                                                        },
    JSON_CONDITION:         { name: 'CDSActionList.NAME.ConditionElse',         category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.JSON_CONDITION,       src: "assets/images/actions/condition.svg",             status: "active"                                                                                                                                        },
    INTENT :                { name: 'CDSActionList.NAME.ConnectBlock',          category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.INTENT,               src:"assets/images/actions/connect_intent.svg",         status: "inactive",                     description: "CDSActionList.DESCRIPTION.ConnectBlock"                                                           },
    ASSIGN_VARIABLE:        { name: 'CDSActionList.NAME.SetAttribute',          category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.ASSIGN_VARIABLE,      src: "assets/images/actions/assign_var.svg",            status: "inactive"                                                                                                                                      },
    ASSIGN_VARIABLE_V2:     { name: 'CDSActionList.NAME.SetAttribute',          category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.ASSIGN_VARIABLE_V2,   src: "assets/images/actions/assign_var.svg",            status: "active"                                                                                                                                        },
    DELETE_VARIABLE:        { name: 'CDSActionList.NAME.DeleteAttribute',       category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.DELETE_VARIABLE,      src: "assets/images/actions/delete_var.svg",            status: "active",                                                                                                                                       },
    REPLACE_BOT:            { name: 'CDSActionList.NAME.ReplaceBot',            category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.REPLACE_BOT,          src: "assets/images/actions/replace_bot.svg",           status: "inactive",                     description: "CDSActionList.DESCRIPTION.ReplaceBot"                                                             },
    REPLACE_BOTV2:          { name: 'CDSActionList.NAME.ReplaceBot',            category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.REPLACE_BOTV2,        src: "assets/images/actions/replace_bot.svg",           status: "active",                       description: "CDSActionList.DESCRIPTION.ReplaceBot"                                                             },
    WAIT :                  { name: 'CDSActionList.NAME.Wait',                  category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.WAIT,                 src:"assets/images/actions/wait.svg",                   status: "active",                       description: "CDSActionList.DESCRIPTION.Wait"                                                                   },
    // WEB_REQUEST : { name: 'CDSActionList.NAME.WebRequest',category: TYPE_ACTION_CATEGORY.INTEGRATIONS, type: TYPE_ACTION.WEB_REQUEST, src:"assets/images/actions/web_request.svg", status: "active", description: ''},
    WEB_REQUESTV2 :         { name: 'CDSActionList.NAME.WebRequest',            category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.WEB_REQUESTV2,        src:"assets/images/actions/web_request.svg",            status: "beta",                         description: ''                                                                                                 },
    EMAIL :                 { name: 'CDSActionList.NAME.SendEmail',             category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.EMAIL,                src:"assets/images/actions/send_email.svg",             status: "active",                       description: "CDSActionList.DESCRIPTION.SendEmail"                                                              },
    WHATSAPP_STATIC:        { name: 'CDSActionList.NAME.WhatsAppStatic',        category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.WHATSAPP_STATIC,      src: "assets/images/actions/whatsapp.svg",              status: "active",                       description: "CDSActionList.DESCRIPTION.WhatsAppStatic"                                                         },
    WHATSAPP_ATTRIBUTE:     { name: 'CDSActionList.NAME.WhatsAppByAttribute',   category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.WHATSAPP_ATTRIBUTE,   src: "assets/images/actions/whatsapp.svg",              status: "active",                       description: "CDSActionList.DESCRIPTION.WhatsAppByAttribute"                                                    },
    // WHATSAPP_SEGMENT: { name: 'CDSActionList.NAME.WhatsAppBySegment', category: TYPE_ACTION_CATEGORY.INTEGRATIONS, type: TYPE_ACTION.WHATSAPP_SEGMENT, src: "assets/images/actions/whatsapp.svg", status: "active", description: "CDSActionList.DESCRIPTION.WhatsAppBySegment" },
    ASKGPT:                 { name: 'CDSActionList.NAME.AskTheKnowledgeBase',   category: TYPE_ACTION_CATEGORY.AI,                  type: TYPE_ACTION.ASKGPT,               src: "assets/images/actions/ask_to_kb.svg",             status: "inactive",                     description: "CDSActionList.DESCRIPTION.AskTheKnowledgeBase"                                                    },
    ASKGPTV2:               { name: 'CDSActionList.NAME.AskTheKnowledgeBase',   category: TYPE_ACTION_CATEGORY.AI,                  type: TYPE_ACTION.ASKGPTV2,             src: "assets/images/actions/ask_to_kb.svg",             status: "active",                       description: "CDSActionList.DESCRIPTION.AskTheKnowledgeBase"                                                    },
    GPT_TASK:               { name: 'CDSActionList.NAME.GPTTask',               category: TYPE_ACTION_CATEGORY.AI,                  type: TYPE_ACTION.GPT_TASK,             src: "assets/images/actions/openai-icon.svg",           status: "active",                       description: "CDSActionList.DESCRIPTION.GPTTask"                                                                },
    GPT_ASSISTANT:          { name: 'CDSActionList.NAME.GPTAssistant',          category: TYPE_ACTION_CATEGORY.AI,                  type: TYPE_ACTION.GPT_ASSISTANT,        src: "assets/images/actions/openai-assistent.svg",      status: "beta",     plan: PLAN_NAME.F,  description: "CDSActionList.DESCRIPTION.GPTAssistant",         doc: "CDSActionList.DOCS.GPTAssistant"          },
    HIDE_MESSAGE:           { name: 'CDSActionList.NAME.HiddenMessage',         category: TYPE_ACTION_CATEGORY.SPECIAL,             type: TYPE_ACTION.HIDE_MESSAGE,         src: "assets/images/actions/hidden_message.svg",        status: "active"                                                                                                                                        },
    CHANGE_DEPARTMENT:      { name: 'CDSActionList.NAME.ChangeDept',            category: TYPE_ACTION_CATEGORY.SPECIAL,             type: TYPE_ACTION.CHANGE_DEPARTMENT,    src: "assets/images/actions/change_department.svg",     status: "active"                                                                                                                                        },
    CODE :                  { name: 'CDSActionList.NAME.Code',                  category: TYPE_ACTION_CATEGORY.SPECIAL,             type: TYPE_ACTION.CODE,                 src:"assets/images/actions/code.svg",                   status: "active",   plan: PLAN_NAME.F,  description: '',                                            disabled: false                                     },
    // ASSIGN_FUNCTION: { name: 'CDSActionList.NAME.SetFunction', category: TYPE_ACTION_CATEGORY.NEW, type: TYPE_ACTION.ASSIGN_FUNCTION, src: "assets/images/actions/assign_var.svg" },
    CAPTURE_USER_REPLY:     { name: 'CDSActionList.NAME.CaptureUserReply',      category: TYPE_ACTION_CATEGORY.FLOW, type: TYPE_ACTION.CAPTURE_USER_REPLY,                  src: "assets/images/actions/capture_user_reply.svg",    status: "active",                       description: "CDSActionList.DESCRIPTION.CaptureUserReply"                                                       },
    QAPLA:                  { name: 'CDSActionList.NAME.Qapla',                 category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.QAPLA,                src: "assets/images/actions/qapla.svg",                 status: "active", plan: PLAN_NAME.E,    description: "CDSActionList.DESCRIPTION.Qapla",             disabled: false                                     },
    MAKE :                  { name: 'CDSActionList.NAME.Make',                  category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.MAKE,                 src:"assets/images/actions/make.svg",                   status: "active", plan: PLAN_NAME.D,    description: '',                                            disabled: false                                     },
    HUPSPOT :               { name: 'CDSActionList.NAME.Hubspot',               category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.HUBSPOT,              src:"assets/images/actions/hubspot.svg",                status: "active", plan: PLAN_NAME.E,    description: ''                                                                                                 },
    CUSTOMERIO :            { name: 'CDSActionList.NAME.Customerio',            category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.CUSTOMERIO,           src:"assets/images/actions/customerio.svg",             status: "active", plan: PLAN_NAME.E,    description: ''                                                                                                 },
    BREVO :                 { name: 'CDSActionList.NAME.Brevo',                 category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.BREVO,                src:"assets/images/actions/brevo.svg",                  status: "active", plan: PLAN_NAME.E,    description: ''                                                                                                 },
    N8N :                   { name: 'CDSActionList.NAME.N8n',                   category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.N8N,                  src:"assets/images/actions/n8n.svg",                    status: "active", plan: PLAN_NAME.E,    description: ''                                                                                                 },


    DFTM_FORM:              { name: 'CDSActionList.NAME.DTMFForm',              category: TYPE_ACTION_CATEGORY.VOICE,               type: TYPE_ACTION_VXML.DTMF_FORM,       src:"assets/images/actions-voice/dtmf_form.svg",        status: "inactive", plan: PLAN_NAME.F,    description: ''                                                                                                 },
    DTMF_MENU:              { name: 'CDSActionList.NAME.DTMFMenu',              category: TYPE_ACTION_CATEGORY.VOICE,               type: TYPE_ACTION_VXML.DTMF_MENU,       src:"assets/images/actions-voice/dtmf_menu.svg",        status: "inactive", plan: PLAN_NAME.F,    description: ''                                                                                                 },
    BLIND_TRANSFER:         { name: 'CDSActionList.NAME.BlindTransfer',         category: TYPE_ACTION_CATEGORY.VOICE,               type: TYPE_ACTION_VXML.BLIND_TRANSFER,  src:"assets/images/actions-voice/blind_transfer.svg",   status: "inactive", plan: PLAN_NAME.F,    description: ''                                                                                                 },
    PLAY_PROMPT:            { name: 'CDSActionList.NAME.PlayPrompt',            category: TYPE_ACTION_CATEGORY.VOICE,               type: TYPE_ACTION_VXML.PLAY_PROMPT,     src:"assets/images/actions-voice/play_prompt.svg",      status: "inactive", plan: PLAN_NAME.F,    description: ''                                                                                                 },
    SPEECH_FORM:            { name: 'CDSActionList.NAME.SpeechForm',            category: TYPE_ACTION_CATEGORY.VOICE,               type: TYPE_ACTION_VXML.SPEECH_FORM,     src:"assets/images/actions-voice/speech_form.svg",      status: "inactive", plan: PLAN_NAME.F,    description: ''                                                                                                 },
}

