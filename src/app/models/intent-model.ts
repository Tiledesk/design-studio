import { v4 as uuidv4 } from 'uuid';
import { Action } from './action-model';

export class Intent {
    webhook_enabled?: boolean;
    enabled?: boolean;
    topic?: string;
    status?: string;
    id_faq_kb?: string;
    question?: string;
    answer?: string;
    form?: Form;
    actions?: Action[];
    id_project?: string;
    language?: string;
    intent_display_name?: string;
    createdBy?: string;
    intent_id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    id?: string;
    attributes?: IntentAttributes;
    type?: string;
    constructor() {
        this.intent_id = uuidv4();
        this.actions = [];
        this.attributes = new IntentAttributes();
        this.type = 'intent';
    }
}
export class IntentAttributes {
    position?: any;
    nextBlockAction?: any;
    connectors?: any;
    constructor() {
        this.position = {x:0, y:0};
        this.nextBlockAction = {
            _tdActionId: uuidv4(),
            _tdActionType: "intent",
            intentName: ""
        };
        this.connectors = {}
    }
}



export class Form {
    cancelCommands?: string[];
    cancelReply?: string;
    id?: number;
    name?: string;
    fields?: Field[];
    description?: string;
    to_JSON() {
        let json = {};
        if (this.cancelCommands) {
            json['cancelCommands'] = this.cancelCommands;
        } else {
            json['cancelCommands'] = []
        }

        if (this.cancelReply) {
            json['cancelReply'] = this.cancelReply;
        } else {
            json['cancelReply'] = ''
        }

        if (this.fields) {
            json['fields'] = JSON.parse(JSON.stringify(this.fields));
        }
        return json;
    }

}

export class Field {
    name: string;
    type: string;
    label: string;
    regex?: string;
    errorLabel?: string;
}

