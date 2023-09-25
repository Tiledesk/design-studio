import { TOUCHING_OPERATOR, LEAD_UPDATED, MEMBER_LEFT_GROUP, LIVE_PAGE } from './../../utils/constants';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { LoggerService } from '../abstract/logger.service';
import { LoggerInstance } from '../logger/loggerInstance';

// mqtt
import {Chat21Service} from './chat-service';

// models
import { MessageModel } from '../../models/message';
import { UserModel } from '../../models/user';

// services
import { ConversationHandlerService } from '../abstract/conversation-handler.service';

// utils
import { MSG_STATUS_RECEIVED, CHAT_REOPENED, CHAT_CLOSED, MEMBER_JOINED_GROUP, TYPE_DIRECT, MESSAGE_TYPE_INFO } from '../../utils/constants';
import {
  htmlEntities,
  compareValues,
  searchIndexInArrayForUid,
  conversationMessagesRef
} from '../../utils/utils';
import { v4 as uuidv4 } from 'uuid';
import { isSender, messageType } from '../../utils/utils-message';


@Injectable({ providedIn: 'root' })
export class MQTTConversationHandler extends ConversationHandlerService {

    // BehaviorSubject
    messageAdded: BehaviorSubject<MessageModel> = new BehaviorSubject<MessageModel>(null);;
    messageChanged: BehaviorSubject<MessageModel> = new BehaviorSubject<MessageModel>(null);;
    messageRemoved: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    messageWait: BehaviorSubject<any> = new BehaviorSubject<string>(null);
    messageInfo: BehaviorSubject<MessageModel> = new BehaviorSubject<MessageModel>(null);
    
    // public variables
    public attributes: any;
    public messages: MessageModel[];
    public conversationWith: string;
    public ref: any;

    // private variables
    private translationMap: Map<string, string>; // LABEL_TODAY, LABEL_TOMORROW
    // private urlNodeFirebase: string;
    private recipientId: string;
    private recipientFullname: string;
    private tenant: string;
    private loggedUser: UserModel;
    private senderId: string;
    private listSubsriptions: any[];
    private CLIENT_BROWSER: string;
    private lastDate = '';

    private logger: LoggerService = LoggerInstance.getInstance()

    constructor(
        public chat21Service: Chat21Service,
        @Inject('skipMessage') private skipInfoMessage: boolean
    ) {
        super();
    }

    /**
     * inizializzo conversation handler
     */
    initialize(recipientId: string,recipientFullName: string,loggedUser: UserModel,tenant: string, translationMap: Map<string, string>) {
        this.logger.log('[MQTTConversationHandler] initWithRecipient:', tenant);
        this.recipientId = recipientId;
        this.recipientFullname = recipientFullName;
        this.loggedUser = loggedUser;
        if (loggedUser) {
            this.senderId = loggedUser.uid;
        }
        this.tenant = tenant;
        this.translationMap = translationMap;

        this.listSubsriptions = [];
        this.CLIENT_BROWSER = navigator.userAgent;
        this.conversationWith = recipientId;
        this.messages = [];
        // this.attributes = this.setAttributes();
    }

    /**
     * mi connetto al nodo messages
     * recupero gli ultimi 100 messaggi
     * creo la reference
     * mi sottoscrivo a change, removed, added
     */
    connect() {
        this.logger.log('[MQTTConversationHandler] connecting conversation handler...', this.conversationWith);
        if (this.conversationWith == null) {
            this.logger.error('[MQTTConversationHandler] cant connect invalid this.conversationWith', this.conversationWith);
            return;
        }
        this.chat21Service.chatClient.lastMessages(this.conversationWith, (err, messages) => {
            if (!err) {
                messages.sort(compareValues('timestamp', 'asc'));
                messages.forEach(message => {
                    const msg: MessageModel = message;        
                    msg.uid = message.message_id;

                    this.addedMessage(msg);
                });
            }
        });
        const handler_message_added = this.chat21Service.chatClient.onMessageAddedInConversation(
            this.conversationWith, (message, topic) => {
                this.logger.log('[MQTTConversationHandler] message added:', message, 'on topic:', topic);
                const msg: MessageModel = message;        
                
                //allow to replace message in unknown status (pending status: '0')
                if(message.attributes && message.attributes.tempUID){
                    msg.uid = message.attributes.tempUID;
                }else{
                    msg.uid = message.message_id
                }

                this.addedMessage(msg);
        });
        const handler_message_updated = this.chat21Service.chatClient.onMessageUpdatedInConversation(
            this.conversationWith,  (message, topic) => {
            this.logger.log('[MQTTConversationHandler] message updated:', message, 'on topic:', topic);
            this.changed(message);
        });
    }

    isGroup(groupId) {
        if (groupId.indexOf('group-') >= 0) {
            return true;
        }
        return false;
    }

    /**
     * bonifico url in testo messaggio
     * recupero time attuale
     * recupero lingua app
     * recupero senderFullname e recipientFullname
     * aggiungo messaggio alla reference
     * @param msg
     * @param conversationWith
     * @param conversationWithDetailFullname
     */
    // sendMessage(
    //     msg,
    //     type,
    //     metadata,
    //     this.conversationWith,
    //     this.conversationWithFullname,
    //     this.loggedUser.uid,
    //     fullname,
    //     this.channelType
    //   );
    sendMessage(
        msg: string,
        typeMsg: string,
        metadataMsg: string,
        conversationWith: string,
        conversationWithFullname: string,
        sender: string,
        senderFullname: string,
        channelType: string,
        attributes: any
    ) {
        const that = this;
        if (!channelType || channelType === 'undefined') {
            channelType = TYPE_DIRECT;
        }

        this.logger.log('[MQTTConversationHandler] Senderfullname', senderFullname);
        const language = document.documentElement.lang;
        const recipientFullname = conversationWithFullname;
        const recipientId = conversationWith;
        attributes.lang = language;
        attributes.tempUID = uuidv4(); //allow to show message in a pending status
        this.chat21Service.chatClient.sendMessage(
            msg,
            typeMsg,
            recipientId,
            recipientFullname,
            senderFullname,
            attributes,
            metadataMsg,
            channelType,
            // language,
            (err, message) => {
                if (err) {
                    message.status = '-100';
                    this.logger.log('[MQTTConversationHandler] ERROR', err);
                } else {
                    message.status = '150';
                }
            }
        );

        const message = new MessageModel(
            attributes.tempUID, //allow to show message in a pending status 
            language,
            conversationWith,
            recipientFullname,
            sender,
            senderFullname,
            0,
            metadataMsg,
            msg,
            Date.now(),
            typeMsg,
            attributes,
            channelType,
            false
        );
        this.addedMessage(message) //allow to show message in a pending status: add pending message in array of messages

        return new MessageModel(
            '',
            language,
            conversationWith,
            recipientFullname,
            sender,
            senderFullname,
            0,
            metadataMsg,
            msg,
            Date.now(),
            typeMsg,
            this.attributes,
            channelType,
            false
        );
    }

    /**
     * dispose reference della conversazione
     */
    dispose() {
        // this.ref.off();
    }


    // ---------------------------------------------------------- //
    // BEGIN PRIVATE FUNCTIONS
    // ---------------------------------------------------------- //
    /** */
    // private setAttributes(): any {
    //     let attributes: any = JSON.parse(sessionStorage.getItem('attributes'));
    //     if (!attributes || attributes === 'undefined') {
    //         attributes = {
    //             client: this.CLIENT_BROWSER,
    //             sourcePage: location.href,
    //             userEmail: this.loggedUser.email,
    //             userFullname: this.loggedUser.fullname
    //         };
    //         this.logger.log('>>>>>>>>>>>>>> setAttributes: ', JSON.stringify(attributes));
    //         sessionStorage.setItem('attributes', JSON.stringify(attributes));
    //     }
    //     return attributes;
    // }

    /** */
    private addedMessage(messageSnapshot: any) {
        const msg = this.messageGenerate(messageSnapshot);
        
        if(this.skipInfoMessage && messageType(MESSAGE_TYPE_INFO, msg)){
            return;
        }
        if(!this.skipInfoMessage && messageType(MESSAGE_TYPE_INFO, msg)){
            this.messageInfo.next(msg)
        }

        this.logger.log('[MQTTConversationHandler] adding message:' + JSON.stringify(msg));
        // this.logger.log('childSnapshot.message_id:' + msg.message_id);
        // this.logger.log('childSnapshot.key:' + msg.key);
        // this.logger.log('childSnapshot.uid:' + msg.uid);
        this.addReplaceMessageInArray(msg.uid, msg);
        this.updateMessageStatusReceived(msg);
        this.messageAdded.next(msg);
    }

    /** */
    private changed(patch: any) {
        if(this.skipInfoMessage && messageType(MESSAGE_TYPE_INFO, patch) ){
            return;
        }
        this.logger.log('[MQTTConversationHandler] updating message with patch', patch);
        const index = searchIndexInArrayForUid(this.messages, patch.message_id);
        if (index > -1) {
            const message = this.messages[index];
            if (message) {
                message.status = patch.status;
                this.logger.log('[MQTTConversationHandler] message found and patched (replacing)', message);
                this.addReplaceMessageInArray(message.uid, message);
                this.messageChanged.next(message);
            }
        }
    }

    /** */
    private removed(childSnapshot: any) {
        const index = searchIndexInArrayForUid(this.messages, childSnapshot.key);
        // controllo superfluo sarà sempre maggiore
        if (index > -1) {
            this.messages.splice(index, 1);
            this.messageRemoved.next(childSnapshot.key);
        }
    }

    /** */
    private messageGenerate(childSnapshot: any) {
        // const msg: MessageModel = childSnapshot.val();
        this.logger.log("[MQTTConversationHandler] childSnapshot >" + JSON.stringify(childSnapshot));
        const msg = childSnapshot;
        // msg.uid = childSnapshot.key;
        msg.text = msg.text? msg.text.trim(): "";//remove black msg with only spaces
        // controllo fatto per i gruppi da rifattorizzare
        if (!msg.sender_fullname || msg.sender_fullname === 'undefined') {
            msg.sender_fullname = msg.sender;
        }
        // bonifico messaggio da url
        // if (msg.type === 'text') {
        //     msg.text = htmlEntities(msg.text);
        // }
        // verifico che il sender è il logged user
        this.logger.log("[MQTTConversationHandler] ****>msg.sender:" + msg.sender);
        msg.isSender = isSender(msg.sender, this.loggedUser.uid);
        // traduco messaggi se sono del server
        if (messageType(MESSAGE_TYPE_INFO, msg)) {
            this.translateInfoSupportMessages(msg);
        }
        return msg;
    }

    /** */
    private addReplaceMessageInArray(uid: string, msg: MessageModel) {
        const index = searchIndexInArrayForUid(this.messages, uid);
        if (index > -1) {
            // const headerDate = this.messages[index].headerDate;
            // msg.headerDate = headerDate;
            this.messages.splice(index, 1, msg);
        } else {
            this.messages.splice(0, 0, msg);
        }
        this.messages.sort(compareValues('timestamp', 'asc'));
    }

    /** */
    private translateInfoSupportMessages(message: MessageModel) {
        // check if the message attributes has parameters and it is of the "MEMBER_JOINED_GROUP" type
        const INFO_SUPPORT_USER_ADDED_SUBJECT = this.translationMap.get('INFO_SUPPORT_USER_ADDED_SUBJECT');
        const INFO_SUPPORT_USER_ADDED_YOU_VERB = this.translationMap.get('INFO_SUPPORT_USER_ADDED_YOU_VERB');
        const INFO_SUPPORT_USER_ADDED_COMPLEMENT = this.translationMap.get('INFO_SUPPORT_USER_ADDED_COMPLEMENT');
        const INFO_SUPPORT_USER_ADDED_VERB = this.translationMap.get('INFO_SUPPORT_USER_ADDED_VERB');
        const INFO_SUPPORT_CHAT_REOPENED = this.translationMap.get('INFO_SUPPORT_CHAT_REOPENED');
        const INFO_SUPPORT_CHAT_CLOSED = this.translationMap.get('INFO_SUPPORT_CHAT_CLOSED');
        const INFO_SUPPORT_LEAD_UPDATED = this.translationMap.get('INFO_SUPPORT_LEAD_UPDATED');
        const INFO_SUPPORT_MEMBER_LEFT_GROUP = this.translationMap.get('INFO_SUPPORT_MEMBER_LEFT_GROUP');
        const INFO_A_NEW_SUPPORT_REQUEST_HAS_BEEN_ASSIGNED_TO_YOU = this.translationMap.get('INFO_A_NEW_SUPPORT_REQUEST_HAS_BEEN_ASSIGNED_TO_YOU');
        const INFO_SUPPORT_LIVE_PAGE = this.translationMap.get('INFO_SUPPORT_LIVE_PAGE');
        
        if (message.attributes.messagelabel
            && message.attributes.messagelabel.parameters
            && message.attributes.messagelabel.key === MEMBER_JOINED_GROUP
        ) {
            let subject: string;
            let verb: string;
            let complement: string;
            if (message.attributes.messagelabel.parameters.member_id === this.loggedUser.uid) {
                subject = INFO_SUPPORT_USER_ADDED_SUBJECT;
                verb = INFO_SUPPORT_USER_ADDED_YOU_VERB;
                complement = INFO_SUPPORT_USER_ADDED_COMPLEMENT;
            } else {
                if (message.attributes.messagelabel.parameters.fullname) {
                    // other user has been added to the group (and he has a fullname)
                    subject = message.attributes.messagelabel.parameters.fullname;
                    verb = INFO_SUPPORT_USER_ADDED_VERB;
                    complement = INFO_SUPPORT_USER_ADDED_COMPLEMENT;
                } else {
                    // other user has been added to the group (and he has not a fullname, so use hes useruid)
                    subject = message.attributes.messagelabel.parameters.member_id;
                    verb = INFO_SUPPORT_USER_ADDED_VERB;
                    complement = INFO_SUPPORT_USER_ADDED_COMPLEMENT;
                }
            }
            message.text = subject + ' ' + verb + ' ' + complement;
        } else if ((message.attributes.messagelabel && message.attributes.messagelabel.key === CHAT_REOPENED)) {
            message.text = INFO_SUPPORT_CHAT_REOPENED;
        } else if ((message.attributes.messagelabel && message.attributes.messagelabel.key === CHAT_CLOSED)) {
            message.text = INFO_SUPPORT_CHAT_CLOSED;
        } else if ((message.attributes && message.attributes.messagelabel && message.attributes.messagelabel.key === TOUCHING_OPERATOR) && message.sender === "system") {
            // console.log('FIREBASEConversationHandlerSERVICE message text', message.text)
            const textAfterColon = message.text.split(":")[1]
            // console.log('FIREBASEConversationHandlerSERVICE message text - textAfterColon', textAfterColon)
            if (textAfterColon !== undefined) {
                message.text = INFO_A_NEW_SUPPORT_REQUEST_HAS_BEEN_ASSIGNED_TO_YOU + ': ' + textAfterColon;
            }
        } else if ((message.attributes.messagelabel && message.attributes.messagelabel.key === LEAD_UPDATED)) {
            message.text = INFO_SUPPORT_LEAD_UPDATED;
        } else if ((message.attributes.messagelabel && message.attributes.messagelabel.key === MEMBER_LEFT_GROUP)) {
           let subject: string;
           if (message.attributes.messagelabel.parameters.fullname) {
               subject = message.attributes.messagelabel.parameters.fullname;
           }else{
               subject = message.attributes.messagelabel.parameters.member_id;
           }
           message.text = subject + ' ' +  INFO_SUPPORT_MEMBER_LEFT_GROUP ;
        } else if(message.attributes.messagelabel && message.attributes.messagelabel.key === LIVE_PAGE){
            let sourceUrl: string = '';
            if(message.attributes && message.attributes.sourcePage){
                sourceUrl = message.attributes.sourcePage 
            }
            if(message.attributes && message.attributes.sourceTitle){
                sourceUrl = '['+message.attributes.sourceTitle+']('+sourceUrl+')'
            }
            message.text= INFO_SUPPORT_LIVE_PAGE + ': ' + sourceUrl
        }
    }


    /**
     * aggiorno lo stato del messaggio
     * questo stato indica che è stato consegnato al client e NON che è stato letto
     * se il messaggio NON è stato inviato da loggedUser AGGIORNO stato a 200
     * @param item
     * @param conversationWith
     */
    private updateMessageStatusReceived(msg) {
        this.logger.log('[MQTTConversationHandler] updateMessageStatusReceived', msg);
        if (msg['status'] < MSG_STATUS_RECEIVED && msg['status'] > 0) {
            this.logger.log('[MQTTConversationHandler] status ', msg['status'], ' < (RECEIVED:200)', MSG_STATUS_RECEIVED);
            if (msg.sender !== this.loggedUser.uid && msg.status < MSG_STATUS_RECEIVED) {
                this.logger.log('[MQTTConversationHandler] updating message with status received');
                this.chat21Service.chatClient.updateMessageStatus(msg.message_id, this.conversationWith, MSG_STATUS_RECEIVED, null);
            }
        }
        // if (msg.status < MSG_STATUS_RECEIVED) {
        //     if (msg.sender !== this.loggedUser.uid && msg.status < MSG_STATUS_RECEIVED) {
        //     const urlNodeMessagesUpdate  = this.urlNodeFirebase + '/' + msg.uid;
        //     this.logger.log('AGGIORNO STATO MESSAGGIO', urlNodeMessagesUpdate);
        //     firebase.database().ref(urlNodeMessagesUpdate).update({ status: MSG_STATUS_RECEIVED });
        //     }
        // }
    }



  unsubscribe(key: string) {
    this.logger.log('[MQTTConversationHandler] unsubscribe: ', key);
    this.listSubsriptions.forEach(sub => {
      this.logger.log('[MQTTConversationHandler] unsubscribe: ', sub.uid, key);
      if (sub.uid === key) {
        sub.unsubscribe(key, null);
        return;
      }
    });
  }

}
