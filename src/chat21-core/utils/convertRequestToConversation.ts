import { TYPE_DIRECT, TYPE_SUPPORT_GROUP } from 'src/chat21-core/utils/constants';
import { ConversationModel } from 'src/chat21-core/models/conversation';
import { Inject, Injectable, OnInit } from '@angular/core';
import { avatarPlaceholder, getColorBck } from './utils-user';
import * as moment from 'moment';

@Injectable()
export class ConvertRequestToConversation {


    
    initialize(){

    }

    getConvFromRequest(request: any): ConversationModel{
        return new ConversationModel(
            request.request_id,
            request.attributes,
            request.request_id && (request.request_id.startsWith('group-') || request.request_id.startsWith('support-group'))? TYPE_SUPPORT_GROUP: TYPE_DIRECT,
            request.lead && request.lead.fullname ? request.lead.fullname: null,
            request.request_id,
            request.request_id,
            request.lead && request.lead.fullname ? request.lead.fullname: null,
            '',
            true,
            request.first_text,
            request.first_text,
            request.requester_id,
            '',
            request.lead && request.lead.fullname ? request.lead.fullname: null,
            '0',
            moment(request.createdAt).unix(),
            getColorBck(request.lead.fullname),
            avatarPlaceholder(request.lead.fullname),
            false,
            'text',
            false
        ); 
    }

}