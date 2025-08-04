export enum TYPE_CHATBOT {
    CHATBOT       = 'chatbot',
    VOICE         = 'voice',
    VOICE_TWILIO  = 'voice_twilio',
    WEBHOOK       = 'webhook',
    COPILOT       = 'copilot',
}

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
            { name: 'last user text', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'lastUserText', description: 'CDSvariablesList.mostUsedELements.last_user_text.description', src: '', icon: 'send' },
            { name: 'user country', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'user_country', description: 'CDSvariablesList.mostUsedELements.user_country.description', src: '', icon: 'language' },
            { name: 'user city', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'user_city', description: 'CDSvariablesList.mostUsedELements.user_city.description', src: '', icon: 'language' },
            { name: 'user language', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'user_language', description: 'CDSvariablesList.mostUsedELements.user_language.description', src: '', icon: 'language' },
            { name: 'transcript', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'transcript', description: 'CDSvariablesList.mostUsedELements.transcript.description', src: '', icon: 'description' },
        ]
    },
    {
        key: 'systemDefined',
        elements: [
            { name: 'payload', chatbot_types: [TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'payload', description: 'CDSvariablesList.systemDefinedElements.payload.description', src: '', icon: 'domain' },
            { name: 'department_id', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'department_id', description: 'CDSvariablesList.systemDefinedElements.department_id.description', src: '', icon: 'domain' },
            { name: 'department_name', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'department_name', description: 'CDSvariablesList.systemDefinedElements.department_name.description', src: '', icon: 'domain' },
            { name: 'project_id', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'project_id', description: 'CDSvariablesList.systemDefinedElements.project_id.description', src: '', icon: 'domain' },
            { name: 'last_message_id', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'last_message_id', description: 'CDSvariablesList.systemDefinedElements.last_message_id.description', src: '', icon: 'textsms' },
            { name: 'conversation_id', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'conversation_id', description: 'CDSvariablesList.systemDefinedElements.conversation_id.description', src: '', icon: 'textsms' },
            { name: 'chatbot_id', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'chatbot_id', description: 'CDSvariablesList.systemDefinedElements.chatbot_id.description', src: '', icon: 'person' },
            { name: 'chatbot_name', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'chatbot_name', description: 'CDSvariablesList.systemDefinedElements.chatbot_name.description', src: '', icon: 'person' },
            { name: 'chatbot_token', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'chatbotToken', description: 'CDSvariablesList.systemDefinedElements.chatbotToken.description', src: '', icon: 'key' },
            { name: 'user_id', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'user_id', description: 'CDSvariablesList.systemDefinedElements.user_id.description', src: '', icon: 'person' },
            { name: 'user_agent', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'user_agent', description: 'CDSvariablesList.systemDefinedElements.user_agent.description', src: '', icon: 'person' },
            { name: 'chatChannel', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'chatChannel', description: 'CDSvariablesList.systemDefinedElements.chatChannel.description', src: '', icon: 'language' },
            { name: 'user_source_page', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'user_source_page', description: 'CDSvariablesList.systemDefinedElements.user_source_page.description', src: '', icon: 'language' },
            { name: 'chat_url', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'chat_url', description: 'CDSvariablesList.systemDefinedElements.chat_url.description', src: '', icon: 'laptop' },
            { name: 'user_ip_address', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'user_ip_address', description: 'CDSvariablesList.systemDefinedElements.user_ip_address.description', src: '', icon: 'laptop' },
            { name: 'ticketId', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'ticketId', description: 'CDSvariablesList.systemDefinedElements.ticketId.description', src: '', icon: 'sell' },
            { name: 'flowError', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'flowError', description: 'CDSvariablesList.systemDefinedElements.flowError.description', src: '', icon: 'error' },
        ]
    },
    {
        key: 'uploadedDocument',
        elements: [
            { name: 'last User Document As Attachment URL', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'lastUserDocumentAsAttachmentURL', description: 'CDSvariablesList.uploadedDocumentElements.lastUserDocumentAsAttachmentURL.description', src: '', icon: 'upload_file' },
            { name: 'last User Document As Inline URL', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'lastUserDocumentAsInlineURL', description: 'CDSvariablesList.uploadedDocumentElements.lastUserDocumentAsInlineURL.description', src: '', icon: 'upload_file' },
            { name: 'last User Document Name', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'lastUserDocumentName', description: 'CDSvariablesList.uploadedDocumentElements.lastUserDocumentName.description', src: '', icon: 'upload_file' },
            { name: 'last User Document Type', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'lastUserDocumentType', description: 'CDSvariablesList.uploadedDocumentElements.lastUserDocumentType.description', src: '', icon: 'upload_file' },
        ]
    },
    {
        key: 'uploadedImage',
        elements: [
            { name: 'last User Image URL', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'lastUserImageURL', description: 'CDSvariablesList.uploadedImageElements.lastUserImageURL.description', src: '', icon: 'image' },
            { name: 'last User Image Name', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'lastUserImageName', description: 'CDSvariablesList.uploadedImageElements.lastUserImageName.description', src: '', icon: 'image' },
            { name: 'last User Image Type', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'lastUserImageType', description: 'CDSvariablesList.uploadedImageElements.lastUserImageType.description', src: '', icon: 'image' },
            { name: 'last User Image Width', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'lastUserImageWidth', description: 'CDSvariablesList.uploadedImageElements.lastUserImageWidth.description', src: '', icon: 'image' },
            { name: 'last User Image Height', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'lastUserImageHeight', description: 'CDSvariablesList.uploadedImageElements.lastUserImageHeight.description', src: '', icon: 'image' },
        ]
    },
    {
        key: 'leadAttributes',
        elements: [
            { name: 'user Email', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'userEmail', description: 'CDSvariablesList.leadAttributesElements.userEmail.description', src: '', icon: 'person' },
            { name: 'user Fullname', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'userFullname', description: 'CDSvariablesList.leadAttributesElements.userFullname.description', src: '', icon: 'person' },
            { name: 'user Phone', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'userPhone', description: 'CDSvariablesList.leadAttributesElements.userPhone.description', src: '', icon: 'person' },
            { name: 'user Lead Id', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'userLeadId', description: 'CDSvariablesList.leadAttributesElements.userLeadId.description', src: '', icon: 'person' },
            { name: 'user Company', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'userCompany', description: 'CDSvariablesList.leadAttributesElements.userCompany.description', src: '', icon: 'person' },
            { name: 'current Phone Number', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'currentPhoneNumber', description: 'CDSvariablesList.leadAttributesElements.currentPhoneNumber.description', src: '', icon: 'person' },
            { name: 'decoded Custom JWT', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'decodedCustomJWT', description: 'CDSvariablesList.leadAttributesElements.decodedCustomJWT.description', src: '', icon: 'password' },
            { name: 'strong Authenticated', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'strongAuthenticated', description: 'CDSvariablesList.leadAttributesElements.strongAuthenticated.description', src: '', icon: 'password' },
        ]
    },
    {
        key: 'dynamicAttributes',
        elements: [
            { name: 'timestamp', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'timestamp', description: 'CDSvariablesList.dynamicAttributesElements.timestamp.description', src: '', icon: 'calendar_today' },
            { name: 'now (ISO date)', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'now', description: 'CDSvariablesList.dynamicAttributesElements.now.description', src: '', icon: 'calendar_today' },
            { name: 'UUID', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'UUID', description: 'CDSvariablesList.dynamicAttributesElements.UUID.description', src: '', icon: 'code' },
            { name: 'UUIDv4', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'UUIDv4', description: 'CDSvariablesList.dynamicAttributesElements.UUIDv4.description', src: '', icon: 'code' },
        ]
    },
    {
        key: 'voiceFlow',
        elements: [
            { name: 'voice Language', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'voiceLanguage', description: 'CDSvariablesList.voiceFlowElements.voiceLanguage.description', src: '', icon: 'language' },
            { name: 'voice Name', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'voiceName', description: 'CDSvariablesList.voiceFlowElements.voiceName.description', src: '', icon: 'person' },
            { name: 'event', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'event', description: 'CDSvariablesList.voiceFlowElements.event.description', src: '', icon: 'perm_phone_msg' },
            { name: 'last block', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'lastBlock', description: 'CDSvariablesList.voiceFlowElements.lastBlock.description', src: '', icon: 'perm_phone_msg' },
            { name: 'callId', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'callId', description: 'CDSvariablesList.voiceFlowElements.callId.description', src: '', icon: 'perm_phone_msg' },
            { name: 'dnis', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'dnis', description: 'CDSvariablesList.voiceFlowElements.dnis.description', src: '', icon: 'perm_phone_msg' },
            { name: 'ani', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'ani', description: 'CDSvariablesList.voiceFlowElements.ani.description', src: '', icon: 'perm_phone_msg' },
            { name: 'last recorded url', chatbot_types: [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT], value: 'lastRecordedUrl', description: 'CDSvariablesList.voiceFlowElements.lastRecordedUrl.description', src: '', icon: 'audiotrack' },
        ]
    },
];

export var tagsList: Array<{key: string, elements: Array<any>}> = [ 
    {   key: 'request',
        elements: []
    },
    {   key: 'lead',
        elements: []
    }
];

export const leadPropertyList: Array<{ name: string, value: string, disabled: boolean, description?: string, src?: string, icon?: string}> = [
    { name: 'email',                value: 'email',             disabled: false },
    { name: 'fullname',             value: 'fullname',          disabled: false },
    { name: 'phone',                value: 'phone',             disabled: false },
    { name: 'company',              value: 'company',           disabled: false },
    { name: 'streetAddress',        value: 'streetAddress',     disabled: false },
    { name: 'city',                 value: 'city',              disabled: false },
    { name: 'region',               value: 'region',            disabled: false },
    { name: 'zipcode',              value: 'zipcode',           disabled: false },
    { name: 'country',              value: 'country',           disabled: false }
]