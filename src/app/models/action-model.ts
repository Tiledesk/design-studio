import { v4 as uuidv4 } from 'uuid';
import { TYPE_ATTACHMENT, TYPE_COMMAND, TYPE_MATH_OPERATOR, TYPE_METHOD_REQUEST, TYPE_OPERATOR } from '../chatbot-design-studio/utils';
import { BRAND_BASE_INFO } from '../chatbot-design-studio/utils-resources';
import { TYPE_ACTION, TYPE_ACTION_VXML } from '../chatbot-design-studio/utils-actions';

export class Action {
    _tdActionType: string;
    _tdActionTitle: string = '';
    _tdActionId: any = uuidv4();
}

export class ActionAssignVariable extends Action {
    destination: string;
    operation: Operation;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.ASSIGN_VARIABLE;
        this.operation = {
            operands: [{
                value: '',
                isVariable: false
            }],
            operators: []
        };
    }
}

export class ActionAssignVariableV2 extends Action {
    destination: string;
    operation: Operation;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.ASSIGN_VARIABLE_V2;
        this.operation = {
            operands: [{
                value: '',
                isVariable: false
            }],
            operators: []
        };
    }
}

export class ActionAssignFunction extends Action {
    functionName: string;
    assignTo: string;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.ASSIGN_FUNCTION;
        this.assignTo = '';
    }
}

export class ActionDeleteVariable extends Action {
    variableName: string
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.DELETE_VARIABLE;
    }
}

export class ActionOnlineAgent extends Action {
    intentName: string;
    trueIntent: string;
    falseIntent: string;
    trueIntentAttributes?: string;
    falseIntentAttributes?: string;
    stopOnConditionMet: boolean;
    constructor() {
        super();
        this.stopOnConditionMet = true;
        this._tdActionType = TYPE_ACTION.ONLINE_AGENTS;
    }
}

export class ActionOnlineAgentV2 extends Action {
    intentName: string;
    trueIntent: string;
    falseIntent: string;
    trueIntentAttributes?: string;
    falseIntentAttributes?: string;
    stopOnConditionMet: boolean;
    selectedOption: string;
    selectedDepartmentId?: string;
    ignoreOperatingHours?: boolean;
    constructor() {
        super();
        this.stopOnConditionMet = true;
        this._tdActionType = TYPE_ACTION.ONLINE_AGENTSV2;
        this.selectedOption = 'all'
        this.ignoreOperatingHours = false;
    }
}

export class ActionOpenHours extends Action {
    slotId?: string;
    trueIntent: string;
    falseIntent: string;
    trueIntentAttributes?: string;
    falseIntentAttributes?: string;
    stopOnConditionMet: boolean;
    constructor() {
        super();
        this.stopOnConditionMet = true;
        // this.slotId = null;
        this._tdActionType = TYPE_ACTION.OPEN_HOURS;
    }
}

export class ActionHideMessage extends Action {
    text: string;
    attributes: {};
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.HIDE_MESSAGE;
        this.attributes = {  subtype: "info"}
    }
}

export class ActionReply extends Action {
    text?: string;
    attributes: Attributes;
    constructor(text?: string, attributes?: Attributes) {
        super();
        // this.text = text ? text : '...';
        this._tdActionType = TYPE_ACTION.REPLY;
        this.attributes = new Attributes();
        if (attributes){
            this.attributes = attributes;
        }
    }
}

export class ActionReplyV2 extends Action {
    text?: string;
    attributes: Attributes;
    noInputIntent: string;
    noMatchIntent: string;
    noInputTimeout: number;
    constructor(text?: string, attributes?: Attributes) {
        super();
        // this.text = text ? text : '...';
        this._tdActionType = TYPE_ACTION.REPLYV2;
        this.attributes = new Attributes();
        if (attributes){
            this.attributes = attributes;
        }
    }
}

export class ActionRandomReply extends Action {
    text?: string;
    attributes: Attributes;
    constructor(text?: string, attributes?: Attributes) {
        super();
        // this.text = text ? text : '...';
        this._tdActionType = TYPE_ACTION.RANDOM_REPLY;
        this.attributes = new Attributes();
        if (attributes){
            this.attributes = attributes;
        }
    }
}

export class ActionWebRequest extends Action {
    method: string;
    url: string;
    headersString: any;
    jsonBody: string;
    assignTo: string;
    assignments: {}
    constructor(){
        super();
        this.url = '';
        this.headersString = {"Content-Type":"*/*", "Cache-Control":"no-cache", "User-Agent": BRAND_BASE_INFO['BRAND_NAME']+"BotRuntime", "Accept":"*/*"};
        this.jsonBody = JSON.stringify({});
        this.assignTo = '';
        this.assignments = {};
        this.method = TYPE_METHOD_REQUEST.GET;
        this._tdActionType = TYPE_ACTION.WEB_REQUEST;
    }
}

export class ActionWebRequestV2 extends Action {
    method: string;
    url: string;
    headersString: any;
    settings: any;
    jsonBody: string;
    formData: Array<FormData>;
    bodyType: string;
    assignResultTo: string;
    assignStatusTo: string;
    assignErrorTo: string;
    trueIntent: string;
    falseIntent: string;
    assignments: {}
    constructor(){
        super();
        this.url = '';
        this.headersString = {"Content-Type":"*/*", "Cache-Control":"no-cache", "User-Agent":BRAND_BASE_INFO['BRAND_NAME']+"BotRuntime", "Accept":"*/*"};
        this.settings = { timeout: 20000 }
        this.jsonBody = null
        this.bodyType = 'none'
        this.formData = [];
        this.assignStatusTo = '';
        this.assignErrorTo = '';
        this.assignments = {};
        this.method = TYPE_METHOD_REQUEST.GET;
        this._tdActionType = TYPE_ACTION.WEB_REQUESTV2;
    }
}

export class FormData {
    name: string;
    value: string;
    type: 'Text' | 'URL';
    enabled: boolean;
    constructor(){
      this.name = '';
      this.value = '';
      this.type = 'Text';
      this.enabled = true
    }
  
  }

export class ActionReplaceBot extends Action {
    botName: string;
    constructor(){
        super();
        this._tdActionType = TYPE_ACTION.REPLACE_BOT;
    }
}

export class ActionReplaceBotV2 extends Action {
    botName: string;
    blockName: string;
    constructor(){
        super();
        this._tdActionType = TYPE_ACTION.REPLACE_BOTV2;
    }
}

export class ActionChangeDepartment extends Action {
    depName: string;
    constructor(){
        super();
        this._tdActionType = TYPE_ACTION.CHANGE_DEPARTMENT;
    }
}

export class ActionJsonCondition extends Action {
    trueIntent: string;
    falseIntent: string;
    stopOnConditionMet: boolean;
    groups: Array<Expression | Operator>;
    trueIntentAttributes?: string;
    falseIntentAttributes?: string;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.JSON_CONDITION;
        this.groups = [];
        this.stopOnConditionMet = true;
    }
}

export class ActionCondition extends Action {
    noelse: boolean;
    trueIntent: string;
    stopOnConditionMet: boolean;
    groups: Array<Expression | Operator>;
    trueIntentAttributes?: string;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.JSON_CONDITION;
        this.groups = [];
        this.stopOnConditionMet = true;
        this.noelse = true;
    }
}

export class ActionIntentConnected extends Action {
    intentName?: string;
    json_payload?: Object;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.INTENT;
    }
}

export class ActionConnectBlock extends Action {
    intentName?: string;
    json_payload?: Object;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.CONNECT_BLOCK;
    }
}

export class ActionEmail extends Action {
    to: string;
    subject: string;
    replyto: string;
    text: string;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.EMAIL;
    }
}

export class ActionWhatsappAttribute extends Action {
    attributeName: string;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.WHATSAPP_ATTRIBUTE;
    }
}

export class ActionWhatsappStatic extends Action {
    templateName: string;
    payload: WhatsappBroadcast;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.WHATSAPP_STATIC;
    }
}

export class ActionSendWhatsapp extends Action {
    templateName: string;
    payload: WhatsappBroadcast;
    trueIntent: string;
    falseIntent: string;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.SEND_WHATSAPP;
        this.payload = new WhatsappBroadcast();
    }
}

export class ActionAgent extends Action{
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.AGENT;
    }
}

export class ActionClose extends Action{
    constructor() {
        super()
        this._tdActionType = TYPE_ACTION.CLOSE;
    }
}

export class ActionWait extends Action {
    millis:number = 500
    constructor() {
        super()
        this._tdActionType = TYPE_ACTION.WAIT;
    
    }
}

export class ActionAskGPT extends Action {
    question: string;
    kbid: string;
    kbName: string;
    assignReplyTo: string;
    assignSourceTo: string;
    trueIntent: string;
    falseIntent: string;
    trueIntentAttributes?: string;
    falseIntentAttributes?: string;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.ASKGPT
    }
}

export class ActionAskGPTV2 extends Action {
    question: string;
    model: string;
    assignReplyTo: string;
    assignSourceTo: string;
    preview?: Array<any>;
    trueIntent: string;
    falseIntent: string;
    trueIntentAttributes?: string;
    falseIntentAttributes?: string;
    namespace: string;
    max_tokens: number;
    temperature: number;
    top_k: number;
    context: string;
    history: boolean;
    advancedPrompt?: boolean;
    namespaceAsName: boolean;
    citations: boolean
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.ASKGPTV2
    }
}

export class ActionGPTTask extends Action {
    question: string;
    assignReplyTo: string;
    context: string;
    history: boolean;
    max_tokens: number;
    temperature: number;
    model: string;
    preview?: Array<any>;
    formatType: 'none' | 'json_object';
    trueIntent: string;
    falseIntent: string;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.GPT_TASK
    }
}

export class ActionGPTAssistant extends Action {
    prompt: string;
    assistantId: string;
    threadIdAttribute: string;
    assignResultTo: string;
    assignErrorTo: string;
    trueIntent: string;
    falseIntent: string;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.GPT_ASSISTANT
    }
}

export class ActionCaptureUserReply extends Action {
    assignResultTo: string;
    goToIntent: string;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.CAPTURE_USER_REPLY
    }   
}

export class ActionCode extends Action {
    source: string
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.CODE
    }   
}

export class Operation {
    operators?: Array<TYPE_MATH_OPERATOR>
    operands: Array<Operand>
}

export class Operand {
    value: string
    isVariable: boolean
    function?: any
}

export class Attributes {
    disableInputMessage: boolean;
    commands: Command[];
    constructor(commands?: Command[]) {
        this.disableInputMessage = false;
        this.commands = [];
        if(commands && commands.length>0){
            this.commands = commands;
        }
    }
}

export class Command {
    type: TYPE_COMMAND;
    message?: Message;
    settings?: Setting;
    time?: number;
    subType?: string;
    constructor(type: TYPE_COMMAND) {
        this.type = type;
    }
}

export class Wait {
    time: number;
    type: TYPE_COMMAND;
    constructor() {
        this.type = TYPE_COMMAND.WAIT;
        this.time = 500;
    }
}

export class Message {
    text: string;
    type: string;
    attributes?: MessageAttributes;
    metadata?: Metadata;
    _tdJSONCondition?: Expression;
    constructor(type: string, text: string, _tdJSONCondition?: Expression) {
        this.type = type;
        this.text = text;
        if(_tdJSONCondition)
            this._tdJSONCondition = _tdJSONCondition
    }
}

export class Setting {
    minDigits?: number;
    maxDigits?: number;
    terminators?: string;
    transferTo?: string;
    transferType?: string;
    bargein?: boolean = true;
    noInputTimeout?: number;
    noInputIntent?: string;
    noMatchIntent?: string;
    trueIntent?: string;
    falseIntent?: string;
    incompleteSpeechTimeout?: number;
    maxtime?: number;
    finalsilence?: number;
    beep?: boolean = false;
    dtmfterm?: boolean = true;

}

export class MessageWithWait extends Message {
    time?: number = 500;
    constructor(type: TYPE_COMMAND, text: string, time: number, _tdJSONCondition?: Expression) {
        super(type,text, _tdJSONCondition);
        this.time = time?time:500;
    }
}

export class MessageAttributes {
    attachment: Attachment;
    constructor() {
        this.attachment = new Attachment();
    }
}

export class Metadata {
    name?: string;
    src: string;
    downloadURL: string;
    width?: number | string;
    height?: number | string; 
    type?: string;
    target?: string;
    size?: string;
}

export class Attachment {
    type: string;
    buttons?: Button[];
    gallery?: GalleryElement[];
    constructor() {
        this.type = TYPE_ATTACHMENT.TEMPLATE;
        this.buttons = [];
    }
}

export class Button {
    uid: string;
    __idConnector: string;
    __idConnection: string;
    __isConnected: boolean;
    type: string;
    value: string;
    link?: string;
    target?: string;
    action?: string;
    attributes?: any;
    show_echo?: boolean;
    alias?: string;

    constructor(
        uid: string,
        idConnector: string,
        isConnected: boolean,
        type: string,
        value: string,
        link?: string,
        target?: string,
        action?: string,
        attributes?: any,
        show_echo?: boolean
    ) {
        this.uid = uid;
        this.__idConnector = idConnector;
        this.__isConnected = isConnected;
        this.type = type;
        this.value = value;
        this.link = link;
        this.target = target;
        this.action = action;
        this.attributes = attributes;
        this.show_echo = show_echo;
    }

    // getAttributesExceptIdAndConnected() {
    //     const { idConnector, isConnected, ...otherAttributes } = this;
    //     return otherAttributes;
    // }
}

export interface GalleryElement{
    preview: Metadata;
    title: string;
    description: string;
    buttons: Button[]
}

export class Expression {
    type: string = 'expression';
    conditions: Array<Condition | Operator>
    constructor(){
        // this.conditions = [ new Condition()]
        this.conditions = []
    }
}

export class Operator {
    type: string = 'operator'
    operator: "AND" | "OR" = "OR"
}

export class Condition {
    type: string = 'condition';
    operand1: string = ''
    operator: TYPE_OPERATOR;
    operand2: {
        type: "const" | "var",
        value?: string,
        name?: string
    }

}

export class WhatsappBroadcast {
    id_project: string;
    phone_number_id: string;
    template: {
        language: string;
        name: string;
    }
    receiver_list: Array<any>;

    constructor(){
        this.id_project = null;;
        this.phone_number_id = null
        this.template = {
            language: null,
            name: null
        },
        this.receiver_list= []
    }
}

export class ActionQapla extends Action {
    trackingNumber: string;
    apiKey: string;
    assignStatusTo: string;
    assignResultTo: string;
    assignErrorTo: string;
    trueIntent: string;
    falseIntent: string;
    constructor() {
        super();
        this._tdActionType = TYPE_ACTION.QAPLA
    }
}

export class ActionMake extends Action {
    url: string;
    bodyParameters: { [ key: string]: string};
    assignStatusTo: string;
    assignErrorTo: string;
    trueIntent: string;
    falseIntent: string;
    constructor(){
        super();
        this.url = '';
        this.bodyParameters = {};
        this.assignStatusTo = '';
        this.assignErrorTo = '';
        this._tdActionType = TYPE_ACTION.MAKE;
    }
}

export class ActionHubspot extends Action {
    token: string;
    bodyParameters: { [ key: string]: string};
    assignStatusTo: string;
    assignErrorTo: string;
    trueIntent: string;
    falseIntent: string;
    constructor(){
        super();
        this.token = '';
        this.bodyParameters = {};
        this.assignStatusTo = '';
        this.assignErrorTo = '';
        this._tdActionType = TYPE_ACTION.HUBSPOT;
    }
}

export class ActionCustomerio extends Action {
    //token: string;
    formid: string;
    bodyParameters: string;
    assignStatusTo: string;
    assignErrorTo: string;
    trueIntent: string;
    falseIntent: string;
    constructor(){
        super();
        //this.token = '';
        this.formid = '';
        this.bodyParameters = "";
        this.assignStatusTo = '';
        this.assignErrorTo = '';
        this._tdActionType = TYPE_ACTION.CUSTOMERIO;
    }
}

export class ActionBrevo extends Action {
    //token: string;
    formid: string;
    bodyParameters: string;
    assignStatusTo: string;
    assignErrorTo: string;
    assignResultTo: string;
    trueIntent: string;
    falseIntent: string;
    constructor(){
        super();
        //this.token = '';
        this.formid = '';
        this.bodyParameters = "";
        this.assignStatusTo = '';
        this.assignErrorTo = '';
        this.assignResultTo = '';
        this._tdActionType = TYPE_ACTION.BREVO;
    }
}

export class ActionN8n extends Action {
    url: string;
    bodyParameters: string;
    assignStatusTo: string;
    assignErrorTo: string;
    assignResultTo: string;
    trueIntent: string;
    falseIntent: string;
    constructor(){
        super();
        this.url = '';
        this.bodyParameters = "";
        this.assignStatusTo = '';
        this.assignErrorTo = '';
        this.assignResultTo = '';
        this._tdActionType = TYPE_ACTION.N8N;
    }
}

export class ActionVoice extends Action {
    text?: string;
    attributes: Attributes;
    constructor(type: TYPE_ACTION_VXML, text?: string, attributes?: Attributes) {
        super();
        // this.text = text ? text : '...';
        this._tdActionType = type;
        this.attributes = new Attributes();
        if (attributes){
            this.attributes = attributes;
        }
    }
}

export class ActionLeadUpdate extends Action {
    update: { [key: string]: string}
    constructor(){
        super();
        this._tdActionType = TYPE_ACTION.LEAD_UPDATE;
        this.update = {};
    }
}

export class ActionClearTranscript extends Action {
    constructor(){
        super();
        this._tdActionType = TYPE_ACTION.CLEAR_TRANSCRIPT;
    }
}

export class ActionMoveToUnassigned extends Action {
    constructor(){
        super();
        this._tdActionType = TYPE_ACTION.MOVE_TO_UNASSIGNED;
    }
}