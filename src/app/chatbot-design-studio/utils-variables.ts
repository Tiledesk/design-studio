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
            { name: 'last user text',                           value: 'lastUserText',                      description: 'CDSvariablesList.mostUsedELements.last_user_text.description',                            src: '', icon: 'send' },
            { name: 'user country',                             value: 'user_country',                      description: 'CDSvariablesList.mostUsedELements.user_country.description',                              src: '', icon: 'language' },
            { name: 'user city',                                value: 'user_city',                         description: 'CDSvariablesList.mostUsedELements.user_city.description',                                 src: '', icon: 'language' },
            { name: 'user language',                            value: 'user_language',                     description: 'CDSvariablesList.mostUsedELements.user_language.description',                             src: '', icon: 'language' },
            { name: 'transcript',                               value: 'transcript',                        description: 'CDSvariablesList.mostUsedELements.transcript.description',                                src: '', icon: 'description'},
        ]
    },
    {
        key: 'systemDefined',
        elements: [
            { name: 'department_id',                            value: 'department_id',                     description: 'CDSvariablesList.systemDefinedElements.department_id.description',                            src: '', icon: 'domain' },
            { name: 'department_name',                          value: 'department_name',                   description: 'CDSvariablesList.systemDefinedElements.department_name.description',                          src: '', icon: 'domain' },
            { name: 'project_id',                               value: 'project_id',                        description: 'CDSvariablesList.systemDefinedElements.project_id.description',                               src: '', icon: 'domain' },
            { name: 'last_message_id',                          value: 'last_message_id',                   description: 'CDSvariablesList.systemDefinedElements.last_message_id.description',                          src: '', icon: 'textsms' },
            { name: 'conversation_id',                          value: 'conversation_id',                   description: 'CDSvariablesList.systemDefinedElements.conversation_id.description',                          src: '', icon: 'textsms' },
            { name: 'chatbot_id',                               value: 'chatbot_id',                        description: 'CDSvariablesList.systemDefinedElements.chatbot_id.description',                               src: '', icon: 'person' },
            { name: 'chatbot_name',                             value: 'chatbot_name',                      description: 'CDSvariablesList.systemDefinedElements.chatbot_name.description',                             src: '', icon: 'person' },
            { name: 'chatbot_token',                            value: 'chatbotToken',                      description: 'CDSvariablesList.systemDefinedElements.chatbotToken.description',                             src: '', icon: 'key' },
            { name: 'user_id',                                  value: 'user_id',                           description: 'CDSvariablesList.systemDefinedElements.user_id.description',                                  src: '', icon: 'person' },
            { name: 'user_agent',                               value: 'user_agent',                        description: 'CDSvariablesList.systemDefinedElements.user_agent.description',                               src: '', icon: 'person' },
            { name: 'chatChannel',                              value: 'chatChannel',                       description: 'CDSvariablesList.systemDefinedElements.chatChannel.description',                              src: '', icon: 'language' },
            { name: 'user_source_page',                         value: 'user_source_page',                  description: 'CDSvariablesList.systemDefinedElements.user_source_page.description',                         src: '', icon: 'language' },
            { name: 'chat_url',                                 value: 'chat_url',                          description: 'CDSvariablesList.systemDefinedElements.chat_url.description',                                 src: '', icon: 'laptop' },
            { name: 'user_ip_address',                          value: 'user_ip_address',                   description: 'CDSvariablesList.systemDefinedElements.user_ip_address.description',                          src: '', icon: 'laptop' },
            { name: 'ticketId',                                 value: 'ticketId',                          description: 'CDSvariablesList.systemDefinedElements.ticketId.description',                                 src: '', icon: 'sell' },
            { name: 'flowError',                                value: 'flowError',                         description: 'CDSvariablesList.systemDefinedElements.flowError.description',                                src: '', icon: 'error' },
            
        ]
    },
    {
        key: 'uploadedDocument',
        elements: [
            { name: 'last User Document As Attachment URL',     value: 'lastUserDocumentAsAttachmentURL',   description: 'CDSvariablesList.uploadedDocumentElements.lastUserDocumentAsAttachmentURL.description',       src: '', icon:'upload_file'},
            { name: 'last User Document As Inline URL',         value: 'lastUserDocumentAsInlineURL',       description: 'CDSvariablesList.uploadedDocumentElements.lastUserDocumentAsInlineURL.description',           src: '', icon:'upload_file'},
            { name: 'last User Document Name',                  value: 'lastUserDocumentName',              description: 'CDSvariablesList.uploadedDocumentElements.lastUserDocumentName.description',                  src: '', icon:'upload_file'},
            { name: 'last User Document Type',                  value: 'lastUserDocumentType',              description: 'CDSvariablesList.uploadedDocumentElements.lastUserDocumentType.description',                  src: '', icon:'upload_file'},
        ]
    },
    {   key: 'uploadedImage',
        elements: [
            { name: 'last User Image URL',                      value: 'lastUserImageURL',                  description: 'CDSvariablesList.uploadedImageElements.lastUserImageURL.description',                         src: '', icon:'image'},
            { name: 'last User Image Name',                     value: 'lastUserImageName',                 description: 'CDSvariablesList.uploadedImageElements.lastUserImageName.description',                        src: '', icon:'image'},
            { name: 'last User Image Type',                     value: 'lastUserImageType',                 description: 'CDSvariablesList.uploadedImageElements.lastUserImageType.description',                        src: '', icon:'image'},
            { name: 'last User Image Width',                    value: 'lastUserImageWidth',                description: 'CDSvariablesList.uploadedImageElements.lastUserImageWidth.description',                       src: '', icon:'image'},
            { name: 'last User Image Height',                   value: 'lastUserImageHeight',               description: 'CDSvariablesList.uploadedImageElements.lastUserImageHeight.description',                      src: '', icon:'image'}
        ]
    },
    {   key: 'leadAttributes',
        elements: [
            { name: 'user Email',                               value: 'userEmail',                         description: 'CDSvariablesList.leadAttributesElements.userEmail.description',                               src: '', icon:'person'},
            { name: 'user Fullname',                            value: 'userFullname',                      description: 'CDSvariablesList.leadAttributesElements.userFullname.description',                            src: '', icon:'person'},
            { name: 'user Phone',                               value: 'userPhone',                         description: 'CDSvariablesList.leadAttributesElements.userPhone.description',                               src: '', icon:'person'},
            { name: 'user Lead Id',                             value: 'userLeadId',                        description: 'CDSvariablesList.leadAttributesElements.userLeadId.description',                              src: '', icon:'person'},
            { name: 'user Company',                             value: 'userCompany',                       description: 'CDSvariablesList.leadAttributesElements.userCompany.description',                             src: '', icon:'person'},
            { name: 'current Phone Number',                     value: 'currentPhoneNumber',                description: 'CDSvariablesList.leadAttributesElements.currentPhoneNumber.description',                      src: '', icon:'person'},
            { name: 'decoded Custom JWT',                       value: 'decodedCustomJWT',                  description: 'CDSvariablesList.leadAttributesElements.decodedCustomJWT.description',                        src: '', icon:'password'},
            { name: 'strong Authenticated',                     value: 'strongAuthenticated',               description: 'CDSvariablesList.leadAttributesElements.strongAuthenticated.description',                     src: '', icon:'password'}
        ]
    },
    {   key: 'dynamicAttributes',
        elements: [
            { name: 'timestamp',                                value: 'timestamp',                         description: 'CDSvariablesList.dynamicAttributesElements.timestamp.description',                            src: '', icon:'calendar_today'},
            { name: 'now (ISO date)',                           value: 'now',                               description: 'CDSvariablesList.dynamicAttributesElements.now.description',                                  src: '', icon:'calendar_today'},
            { name: 'UUID',                                     value: 'UUID',                              description: 'CDSvariablesList.dynamicAttributesElements.UUID.description',                                 src: '', icon:'code'},
            { name: 'UUIDv4',                                   value: 'UUIDv4',                            description: 'CDSvariablesList.dynamicAttributesElements.UUIDv4.description',                               src: '', icon:'code'},
        ]
    },
    {   key: 'voiceFlow',
        elements: [
            { name: 'voice Language',                           value: 'voiceLanguage',                     description: 'CDSvariablesList.voiceFlowElements.voiceLanguage.description',                                src: '', icon:'language'},
            { name: 'voice Name',                               value: 'voiceName',                         description: 'CDSvariablesList.voiceFlowElements.voiceName.description',                                    src: '', icon:'person'},
            { name: 'event',                                    value: 'event',                             description: 'CDSvariablesList.voiceFlowElements.event.description',                                        src: '', icon:'perm_phone_msg'},
            { name: 'last block',                               value: 'lastBlock',                         description: 'CDSvariablesList.voiceFlowElements.lastBlock.description',                                    src: '', icon:'perm_phone_msg'},
            { name: 'callId',                                   value: 'callId',                            description: 'CDSvariablesList.voiceFlowElements.callId.description',                                       src: '', icon:'perm_phone_msg'},
            { name: 'dnis',                                     value: 'dnis',                              description: 'CDSvariablesList.voiceFlowElements.dnis.description',                                         src: '', icon:'perm_phone_msg'},
            { name: 'ani',                                      value: 'ani',                               description: 'CDSvariablesList.voiceFlowElements.ani.description',                                          src: '', icon:'perm_phone_msg'},
        ]
    }
]


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