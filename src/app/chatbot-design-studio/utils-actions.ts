import { LEAD_UPDATED } from './../../chat21-core/utils/constants';
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
    CONNECT_BLOCK       = 'connect_block',
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
    LEAD_UPDATE         = 'leadupdate',
    CLEAR_TRANSCRIPT    = 'clear_transcript',
    MOVE_TO_UNASSIGNED  = 'move_to_unassigned',
    SEND_WHATSAPP       = 'send_whatsapp'
}

export enum TYPE_ACTION_VXML {
    DTMF_FORM           = 'dtmf_form',
    DTMF_MENU           = 'dtmf_menu',
    BLIND_TRANSFER      = 'blind_transfer',
    PLAY_PROMPT         = 'play_prompt',
    SPEECH_FORM         = 'speech_form',
    AUDIO_RECORD        = 'audio_record'
}

export enum TYPE_ACTION_CATEGORY {
    MOST_USED       = 'Most Used',
    AI              = 'AI',
    FLOW            = 'Flow',
    INTEGRATIONS    = 'Integrations',
    SPECIAL         = 'Special',
    NEW             = 'New',
    VOICE           = 'Voice',
    "VOICE-TWILIO"  = 'Voice Twilio'
}

export const ACTION_CATEGORY =[
    { type: getKeyByValue(TYPE_ACTION_CATEGORY.MOST_USED, TYPE_ACTION_CATEGORY),    name: 'CDSActionCategory.MostUsed',     src: 'assets/images/actions_category/most_used.svg'},
    { type: getKeyByValue(TYPE_ACTION_CATEGORY.AI, TYPE_ACTION_CATEGORY),           name: 'CDSActionCategory.AI',           src: 'assets/images/actions_category/ai.svg'},
    { type: getKeyByValue(TYPE_ACTION_CATEGORY.FLOW, TYPE_ACTION_CATEGORY),         name: 'CDSActionCategory.Flow',         src: 'assets/images/actions_category/flow.svg'},
    { type: getKeyByValue(TYPE_ACTION_CATEGORY.INTEGRATIONS, TYPE_ACTION_CATEGORY), name: 'CDSActionCategory.Integrations', src: 'assets/images/actions_category/integrations.svg'},
    { type: getKeyByValue(TYPE_ACTION_CATEGORY.SPECIAL, TYPE_ACTION_CATEGORY),      name: 'CDSActionCategory.Special',      src: 'assets/images/actions_category/special.svg'},
    { type: getKeyByValue(TYPE_ACTION_CATEGORY.VOICE, TYPE_ACTION_CATEGORY),        name: 'CDSActionCategory.Voice',        src: 'assets/images/actions_category/voice.svg'},
    { type: getKeyByValue(TYPE_ACTION_CATEGORY['VOICE-TWILIO'], TYPE_ACTION_CATEGORY), name: 'CDSActionCategory.VoiceTwilio',  src: 'assets/images/actions_category/voice.svg'},
    // { type: getKeyByValue(TYPE_ACTION_CATEGORY.NEW, TYPE_ACTION_CATEGORY), name: TYPE_ACTION_CATEGORY.NEW, src: 'assets/images/actions_category/new.svg'}
]

export function getKeyByValue(value, keys) {
    const indexOfS = Object.values(keys).indexOf(value as unknown as any);
    const key = Object.keys(keys)[indexOfS];
    return key;
}

export const ACTIONS_LIST: {[key: string]: {name: string, category: TYPE_ACTION_CATEGORY, type: TYPE_ACTION | TYPE_ACTION_VXML, src: string, status: 'active' | 'inactive' | 'beta', plan?: PLAN_NAME, badge?: string, doc?: string, disabled?: boolean}}= {
    REPLY :                 { name: 'CDSActionList.NAME.Reply',                 category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.REPLY,                src:"assets/images/actions/reply.svg",                  status: "active" ,                      doc: "CDSActionList.DOC.Reply",                                         },
    REPLYV2 :               { name: 'CDSActionList.NAME.ReplyV2',               category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.REPLYV2,              src:"assets/images/actions/reply_v2.svg",               status: "active" ,                      doc: "CDSActionList.DOC.ReplyV2",                                       },
    RANDOM_REPLY :          { name: 'CDSActionList.NAME.RandomReply',           category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.RANDOM_REPLY,         src:"assets/images/actions/random_reply.svg",           status: "active",                       doc: "CDSActionList.DOC.RandomReply"                                    },
    AGENT :                 { name: 'CDSActionList.NAME.AgentHandoff',          category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.AGENT,                src:"assets/images/actions/agent_handoff.svg",          status: "active",                       doc: "CDSActionList.DOC.AgentHandoff"                                   },
    CLOSE :                 { name: 'CDSActionList.NAME.Close',                 category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.CLOSE,                src:"assets/images/actions/close.svg",                  status: "active",                       doc: "CDSActionList.DOC.Close"                                          },
    OPEN_HOURS:             { name: 'CDSActionList.NAME.IfOperatingHours',      category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.OPEN_HOURS,           src: "assets/images/actions/open_hours.svg",            status: "active",                       doc: "CDSActionList.DOC.IfOperatingHours"                               },
    ONLINE_AGENTS:          { name: 'CDSActionList.NAME.IfOnlineAgent',         category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.ONLINE_AGENTS,        src: "assets/images/actions/online_agents.svg",         status: "inactive",                     doc: "CDSActionList.DOC.IfOnlineAgent"                                  },
    ONLINE_AGENTSV2:        { name: 'CDSActionList.NAME.IfOnlineAgent',         category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.ONLINE_AGENTSV2,      src: "assets/images/actions/online_agents.svg",         status: "active",                       doc: "CDSActionList.DOC.IfOnlineAgent"                                  },
    CLEAR_TRANSCRIPT:       { name: 'CDSActionList.NAME.ClearTranscript',       category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.CLEAR_TRANSCRIPT,     src:"assets/images/actions/clear_transcript.svg",       status: "active", badge: 'NEW',         doc: "CDSActionList.DOC.ClearTranscript"                                },
    MOVE_TO_UNASSIGNED:     { name: 'CDSActionList.NAME.MoveToUnassigned',      category: TYPE_ACTION_CATEGORY.MOST_USED,           type: TYPE_ACTION.MOVE_TO_UNASSIGNED,   src:"assets/images/actions/move_to_unassigned.svg",     status: "active", badge: 'NEW',         doc: "CDSActionList.DOC.MoveToUnassigned"                               },
    CONDITION:              { name: 'CDSActionList.NAME.Condition',             category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.CONDITION,            src: "assets/images/actions/condition.svg",             status: "active",                       doc: "CDSActionList.DOC.Condition"                                      },
    JSON_CONDITION:         { name: 'CDSActionList.NAME.ConditionElse',         category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.JSON_CONDITION,       src: "assets/images/actions/condition.svg",             status: "active",                       doc: "CDSActionList.DOC.ConditionElse"                                  },
    INTENT :                { name: 'CDSActionList.NAME.ConnectBlock',          category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.INTENT,               src:"assets/images/actions/connect_intent.svg",         status: "inactive",                     doc: ""                                                                 },
    CONNECT_BLOCK :         { name: 'CDSActionList.NAME.ConnectBlock',          category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.CONNECT_BLOCK,        src:"assets/images/actions/connect_intent.svg",         status: "active", plan: PLAN_NAME.F,    doc: ""                                                                 },
    ASSIGN_VARIABLE:        { name: 'CDSActionList.NAME.SetAttribute',          category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.ASSIGN_VARIABLE,      src: "assets/images/actions/assign_var.svg",            status: "inactive",                     doc: "CDSActionList.DOC.SetAttribute"                                   },
    ASSIGN_VARIABLE_V2:     { name: 'CDSActionList.NAME.SetAttribute',          category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.ASSIGN_VARIABLE_V2,   src: "assets/images/actions/assign_var.svg",            status: "active",                       doc: "CDSActionList.DOC.SetAttribute"                                   },
    DELETE_VARIABLE:        { name: 'CDSActionList.NAME.DeleteAttribute',       category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.DELETE_VARIABLE,      src: "assets/images/actions/delete_var.svg",            status: "active",                       doc: "CDSActionList.DOC.DeleteAttribute"                                },
    REPLACE_BOT:            { name: 'CDSActionList.NAME.ReplaceBot',            category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.REPLACE_BOT,          src: "assets/images/actions/replace_bot.svg",           status: "inactive",                     doc: "CDSActionList.DOC.ReplaceBot"                                     },
    REPLACE_BOTV2:          { name: 'CDSActionList.NAME.ReplaceBot',            category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.REPLACE_BOTV2,        src: "assets/images/actions/replace_bot.svg",           status: "active",                       doc: "CDSActionList.DOC.ReplaceBot"                                     },
    WAIT :                  { name: 'CDSActionList.NAME.Wait',                  category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.WAIT,                 src:"assets/images/actions/wait.svg",                   status: "active",                       doc: "CDSActionList.DOC.Wait"                                           },
    // WEB_REQUEST : { name: 'CDSActionList.NAME.WebRequest',category: TYPE_ACTION_CATEGORY.INTEGRATIONS, type: TYPE_ACTION.WEB_REQUEST, src:"assets/images/actions/web_request.svg", status: "active", description: ''},
    WEB_REQUESTV2 :         { name: 'CDSActionList.NAME.WebRequest',            category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.WEB_REQUESTV2,        src:"assets/images/actions/web_request.svg",            status: "active",                       doc: "CDSActionList.DOC.WebRequest"                                     },
    EMAIL :                 { name: 'CDSActionList.NAME.SendEmail',             category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.EMAIL,                src:"assets/images/actions/send_email.svg",             status: "active",                       doc: "CDSActionList.DOC.SendEmail"                                      },
    WHATSAPP_STATIC:        { name: 'CDSActionList.NAME.WhatsAppStatic',        category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.WHATSAPP_STATIC,      src: "assets/images/actions/whatsapp.svg",              status: "active",                       doc: "CDSActionList.DOC.WhatsAppStatic"                                 },
    WHATSAPP_ATTRIBUTE:     { name: 'CDSActionList.NAME.WhatsAppByAttribute',   category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.WHATSAPP_ATTRIBUTE,   src: "assets/images/actions/whatsapp.svg",              status: "active",                       doc: "CDSActionList.DOC.WhatsAppByAttribute"                            },
    SEND_WHATSAPP:          { name: 'CDSActionList.NAME.SendWhatsapp',          category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.SEND_WHATSAPP,        src: "assets/images/actions/whatsapp.svg",              status: "active",   badge: 'NEW',       doc: ""                                                                 },
    // WHATSAPP_SEGMENT: { name: 'CDSActionList.NAME.WhatsAppBySegment', category: TYPE_ACTION_CATEGORY.INTEGRATIONS, type: TYPE_ACTION.WHATSAPP_SEGMENT, src: "assets/images/actions/whatsapp.svg", status: "active", description: "CDSActionList.DESCRIPTION.WhatsAppBySegment" },
    ASKGPT:                 { name: 'CDSActionList.NAME.AskTheKnowledgeBase',   category: TYPE_ACTION_CATEGORY.AI,                  type: TYPE_ACTION.ASKGPT,               src: "assets/images/actions/ask_to_kb.svg",             status: "inactive",                     doc: "CDSActionList.DOC.AskTheKnowledgeBase",                           },
    ASKGPTV2:               { name: 'CDSActionList.NAME.AskTheKnowledgeBase',   category: TYPE_ACTION_CATEGORY.AI,                  type: TYPE_ACTION.ASKGPTV2,             src: "assets/images/actions/ask_to_kb.svg",             status: "active",                       doc: "CDSActionList.DOC.AskTheKnowledgeBase",                           },
    GPT_TASK:               { name: 'CDSActionList.NAME.GPTTask',               category: TYPE_ACTION_CATEGORY.AI,                  type: TYPE_ACTION.GPT_TASK,             src: "assets/images/actions/openai-icon.svg",           status: "active",                       doc: "CDSActionList.DOC.GPTTask",                                       },
    GPT_ASSISTANT:          { name: 'CDSActionList.NAME.GPTAssistant',          category: TYPE_ACTION_CATEGORY.AI,                  type: TYPE_ACTION.GPT_ASSISTANT,        src: "assets/images/actions/openai-assistent.svg",      status: "active",   plan: PLAN_NAME.F,  doc: "CDSActionList.DOC.GPTAssistant",                                  },
    HIDE_MESSAGE:           { name: 'CDSActionList.NAME.HiddenMessage',         category: TYPE_ACTION_CATEGORY.SPECIAL,             type: TYPE_ACTION.HIDE_MESSAGE,         src: "assets/images/actions/hidden_message.svg",        status: "active",                       doc: "CDSActionList.DOC.HiddenMessage",                                 },
    CHANGE_DEPARTMENT:      { name: 'CDSActionList.NAME.ChangeDept',            category: TYPE_ACTION_CATEGORY.SPECIAL,             type: TYPE_ACTION.CHANGE_DEPARTMENT,    src: "assets/images/actions/change_department.svg",     status: "active",                       doc: "CDSActionList.DOC.ChangeDept",                                    },
    CODE :                  { name: 'CDSActionList.NAME.Code',                  category: TYPE_ACTION_CATEGORY.SPECIAL,             type: TYPE_ACTION.CODE,                 src:"assets/images/actions/code.svg",                   status: "active",   plan: PLAN_NAME.F,  doc: "CDSActionList.DOC.Code",                      disabled: false     },
    // ASSIGN_FUNCTION: { name: 'CDSActionList.NAME.SetFunction', category: TYPE_ACTION_CATEGORY.NEW, type: TYPE_ACTION.ASSIGN_FUNCTION, src: "assets/images/actions/assign_var.svg" },
    CAPTURE_USER_REPLY:     { name: 'CDSActionList.NAME.CaptureUserReply',      category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.CAPTURE_USER_REPLY,   src: "assets/images/actions/capture_user_reply.svg",    status: "active",                       doc: "CDSActionList.DOC.CaptureUserReply"                               },
    LEAD_UPDATE :           { name: 'CDSActionList.NAME.LeadUpdate',            category: TYPE_ACTION_CATEGORY.FLOW,                type: TYPE_ACTION.LEAD_UPDATE,          src:"assets/images/actions/lead_update.svg",            status: "active",                       doc: "CDSActionList.DOC.LeadUpdate"                                     },
    QAPLA:                  { name: 'CDSActionList.NAME.Qapla',                 category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.QAPLA,                src: "assets/images/actions/qapla.svg",                 status: "active", plan: PLAN_NAME.E,    doc: "CDSActionList.DOC.Qapla",                       disabled: false   },
    MAKE :                  { name: 'CDSActionList.NAME.Make',                  category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.MAKE,                 src:"assets/images/actions/make.svg",                   status: "active", plan: PLAN_NAME.D,    doc: "CDSActionList.DOC.Make",                        disabled: false   },
    HUPSPOT :               { name: 'CDSActionList.NAME.Hubspot',               category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.HUBSPOT,              src:"assets/images/actions/hubspot.svg",                status: "active", plan: PLAN_NAME.E,    doc: "CDSActionList.DOC.Hubspot"                                        },
    CUSTOMERIO :            { name: 'CDSActionList.NAME.Customerio',            category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.CUSTOMERIO,           src:"assets/images/actions/customerio.svg",             status: "active", plan: PLAN_NAME.E,    doc: "CDSActionList.DOC.Customerio"                                     },
    BREVO :                 { name: 'CDSActionList.NAME.Brevo',                 category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.BREVO,                src:"assets/images/actions/brevo.svg",                  status: "active", plan: PLAN_NAME.E,    doc: "CDSActionList.DOC.Brevo"                                          },
    N8N :                   { name: 'CDSActionList.NAME.N8n',                   category: TYPE_ACTION_CATEGORY.INTEGRATIONS,        type: TYPE_ACTION.N8N,                  src:"assets/images/actions/n8n.svg",                    status: "active", plan: PLAN_NAME.E,    doc: "CDSActionList.DOC.N8n"                                            },

    DFTM_FORM:              { name: 'CDSActionList.NAME.DTMFForm',              category: TYPE_ACTION_CATEGORY.VOICE,               type: TYPE_ACTION_VXML.DTMF_FORM,       src:"assets/images/actions-voice/dtmf_form.svg",        status: "active", plan: PLAN_NAME.F,    doc: ""                                                                 },
    DTMF_MENU:              { name: 'CDSActionList.NAME.DTMFMenu',              category: TYPE_ACTION_CATEGORY.VOICE,               type: TYPE_ACTION_VXML.DTMF_MENU,       src:"assets/images/actions-voice/dtmf_menu.svg",        status: "active", plan: PLAN_NAME.F,    doc: ""                                                                 },
    BLIND_TRANSFER:         { name: 'CDSActionList.NAME.BlindTransfer',         category: TYPE_ACTION_CATEGORY.VOICE,               type: TYPE_ACTION_VXML.BLIND_TRANSFER,  src:"assets/images/actions-voice/blind_transfer.svg",   status: "active", plan: PLAN_NAME.F,    doc: ""                                                                 },
    PLAY_PROMPT:            { name: 'CDSActionList.NAME.PlayPrompt',            category: TYPE_ACTION_CATEGORY.VOICE,               type: TYPE_ACTION_VXML.PLAY_PROMPT,     src:"assets/images/actions-voice/play_prompt.svg",      status: "active", plan: PLAN_NAME.F,    doc: ""                                                                 },
    SPEECH_FORM:            { name: 'CDSActionList.NAME.SpeechForm',            category: TYPE_ACTION_CATEGORY.VOICE,               type: TYPE_ACTION_VXML.SPEECH_FORM,     src:"assets/images/actions-voice/speech_form.svg",      status: "active", plan: PLAN_NAME.F,    doc: ""                                                                 },
    AUDIO_RECORD:           { name: 'CDSActionList.NAME.AudioRecord',           category: TYPE_ACTION_CATEGORY.VOICE,               type: TYPE_ACTION_VXML.AUDIO_RECORD,    src:"assets/images/actions-voice/audio_record.svg",     status: "active", plan: PLAN_NAME.F,    doc: ""                                                                 },

    DFTM_FORM_TWILIO:       { name: 'CDSActionList.NAME.DTMFForm',              category: TYPE_ACTION_CATEGORY['VOICE-TWILIO'],     type: TYPE_ACTION_VXML.DTMF_FORM,       src:"assets/images/actions-voice/dtmf_form.svg",        status: "active", plan: PLAN_NAME.F,    doc: ""                                                                 },
    DTMF_MENU_TWILIO:       { name: 'CDSActionList.NAME.DTMFMenu',              category: TYPE_ACTION_CATEGORY['VOICE-TWILIO'],     type: TYPE_ACTION_VXML.DTMF_MENU,       src:"assets/images/actions-voice/dtmf_menu.svg",        status: "active", plan: PLAN_NAME.F,    doc: ""                                                                 },
    BLIND_TRANSFER_TWILIO:  { name: 'CDSActionList.NAME.BlindTransfer',         category: TYPE_ACTION_CATEGORY['VOICE-TWILIO'],     type: TYPE_ACTION_VXML.BLIND_TRANSFER,  src:"assets/images/actions-voice/blind_transfer.svg",   status: "active", plan: PLAN_NAME.F,    doc: ""                                                                 },
    PLAY_PROMPT_TWILIO:     { name: 'CDSActionList.NAME.PlayPrompt',            category: TYPE_ACTION_CATEGORY['VOICE-TWILIO'],     type: TYPE_ACTION_VXML.PLAY_PROMPT,     src:"assets/images/actions-voice/play_prompt.svg",      status: "active", plan: PLAN_NAME.F,    doc: ""                                                                 },
    SPEECH_FORM_TWILIO:     { name: 'CDSActionList.NAME.SpeechForm',            category: TYPE_ACTION_CATEGORY['VOICE-TWILIO'],     type: TYPE_ACTION_VXML.SPEECH_FORM,     src:"assets/images/actions-voice/speech_form.svg",      status: "active", plan: PLAN_NAME.F,    doc: ""                                                                 },

}

