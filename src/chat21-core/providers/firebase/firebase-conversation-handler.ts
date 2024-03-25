
import { Inject, Injectable, Optional } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// firebase
// import firebase from 'firebase/app';

// models

import { UserModel } from '../../models/user';
import { MessageModel } from '../../models/message';
// services
import { ConversationHandlerService } from '../abstract/conversation-handler.service';
import { LoggerService } from '../abstract/logger.service';
import { LoggerInstance } from '../logger/loggerInstance';
// utils
import { MSG_STATUS_RECEIVED, CHAT_REOPENED, CHAT_CLOSED, MEMBER_JOINED_GROUP, TYPE_DIRECT, MESSAGE_TYPE_INFO, TOUCHING_OPERATOR, LEAD_UPDATED, MEMBER_LEFT_GROUP, LIVE_PAGE } from '../../utils/constants';
import { compareValues, searchIndexInArrayForUid, conversationMessagesRef } from '../../utils/utils';


import { messageType, isEmojii, isSender } from 'src/chat21-core/utils/utils-message';




// @Injectable({ providedIn: 'root' })
@Injectable()
export class FirebaseConversationHandler extends ConversationHandlerService {

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


    // private variables
    private translationMap: Map<string, string>; // LABEL_TODAY, LABEL_TOMORROW
    private urlNodeFirebase: string;
    private recipientId: string;
    private recipientFullname: string;
    private tenant: string;
    private loggedUser: UserModel;
    private senderId: string;
    private listSubsriptions: any[];
    private CLIENT_BROWSER: string;
    private lastDate = '';
    private logger: LoggerService = LoggerInstance.getInstance()
    
    private firebase: any;
    private ref: any;

    constructor(@Inject('skipMessage') private skipMessage: boolean) {
        super();
    }

    /**
     * inizializzo conversation handler
     */
    async initialize(recipientId: string, recipientFullName: string, loggedUser: UserModel, tenant: string, translationMap: Map<string, string>) {
        this.logger.log('[FIREBASEConversationHandlerSERVICE] initWithRecipient', recipientId, recipientFullName, loggedUser, tenant, translationMap)
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
        const { default: firebase} = await import("firebase/app");
        await Promise.all([import("firebase/database")]);
        this.firebase = firebase
        this.ref = this.firebase.database['Query'];
    }

    /**
     * mi connetto al nodo messages
     * recupero gli ultimi 100 messaggi
     * creo la reference
     * mi sottoscrivo a change, removed, added
     */
    connect() {
        this.lastDate = '';
        const that = this;
        this.urlNodeFirebase = conversationMessagesRef(this.tenant, this.loggedUser.uid);
        this.urlNodeFirebase = this.urlNodeFirebase + this.conversationWith;
        this.logger.debug('[FIREBASEConversationHandlerSERVICE] urlNodeFirebase *****', this.urlNodeFirebase);
        const firebaseMessages = this.firebase.database().ref(this.urlNodeFirebase);
        this.ref = firebaseMessages.orderByChild('timestamp').limitToLast(100);
        this.ref.on('child_added', (childSnapshot) => {
            that.logger.debug('[FIREBASEConversationHandlerSERVICE] >>>>>>>>>>>>>> child_added: ', childSnapshot.val())
            const msg: MessageModel = childSnapshot.val();        
            msg.uid = childSnapshot.key;

            that.addedNew(msg);
        });
        this.ref.on('child_changed', (childSnapshot) => {
            that.logger.debug('[FIREBASEConversationHandlerSERVICE] >>>>>>>>>>>>>> child_changed: ', childSnapshot.val())
            that.changed(childSnapshot);
        });
        this.ref.on('child_removed', (childSnapshot) => {
            that.removed(childSnapshot);
        });
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
        const firebaseMessagesCustomUid = this.firebase.database().ref(this.urlNodeFirebase);

        // const key = messageRef.key;
        const lang = document.documentElement.lang;
        const recipientFullname = conversationWithFullname;
        const timestamp = this.firebase.database.ServerValue.TIMESTAMP
        const message = new MessageModel(
            '',
            lang,
            conversationWith,
            recipientFullname,
            sender,
            senderFullname,
            0,
            metadataMsg,
            msg,
            timestamp,
            //dateSendingMessage,
            typeMsg,
            attributes,
            channelType,
            false
        );
        const messageRef = firebaseMessagesCustomUid.push({
            language: lang,
            recipient: conversationWith,
            recipient_fullname: recipientFullname,
            sender: sender,
            sender_fullname: senderFullname,
            status: 0,
            metadata: metadataMsg,
            text: msg,
            timestamp: this.firebase.database.ServerValue.TIMESTAMP,
            type: typeMsg,
            attributes: attributes,
            channel_type: channelType
            // isSender: true
        });

        // const message = new MessageModel(
        //     key,
        //     language, // language
        //     conversationWith, // recipient
        //     recipientFullname, // recipient_full_name
        //     sender, // sender
        //     senderFullname, // sender_full_name
        //     0, // status
        //     metadata, // metadata
        //     msg, // text
        //     0, // timestamp
        //     type, // type
        //     this.attributes, // attributes
        //     channelType, // channel_type
        //     true // is_sender
        // );
        this.logger.debug('[FIREBASEConversationHandlerSERVICE] sendMessage --> messages: ', this.messages);
        this.logger.debug('[FIREBASEConversationHandlerSERVICE] sendMessage --> senderFullname: ', senderFullname);
        this.logger.debug('[FIREBASEConversationHandlerSERVICE] sendMessage --> sender: ', sender);
        this.logger.debug('[FIREBASEConversationHandlerSERVICE] sendMessage --> SEND MESSAGE: ', msg, channelType);
        return message
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
    //     const attributes: any = {
    //         client: this.CLIENT_BROWSER,
    //         sourcePage: location.href,

    //     };

    //     if(this.loggedUser && this.loggedUser.email ){
    //         attributes.userEmail = this.loggedUser.email
    //     }
    //     if(this.loggedUser && this.loggedUser.fullname) {
    //         attributes.userFullname = this.loggedUser.fullname
    //     }


    //     // let attributes: any = JSON.parse(sessionStorage.getItem('attributes'));
    //     // if (!attributes || attributes === 'undefined') {
    //     //     attributes = {
    //     //         client: this.CLIENT_BROWSER,
    //     //         sourcePage: location.href,
    //     //         userEmail: this.loggedUser.email,
    //     //         userFullname: this.loggedUser.fullname
    //     //     };
    //     //     this.logger.printLog('>>>>>>>>>>>>>> setAttributes: ', JSON.stringify(attributes));
    //     //     sessionStorage.setItem('attributes', JSON.stringify(attributes));
    //     // }
    //     return attributes;
    // }

    /** */
    private added(childSnapshot: any) {
        const msg = this.messageGenerate(childSnapshot);
        // msg.attributes && msg.attributes['subtype'] === 'info'
        if (this.skipMessage && messageType(MESSAGE_TYPE_INFO, msg)) {
            return;
        }
        if(!this.skipMessage && messageType(MESSAGE_TYPE_INFO, msg)) {
            this.messageInfo.next(msg)
        }
        this.addRepalceMessageInArray(childSnapshot.key, msg);
        this.messageAdded.next(msg);
    }

    private addedNew(message:MessageModel){
        const msg = this.messageCommandGenerate(message);
        if(this.isValidMessage(msg)){
            if (this.skipMessage && messageType(MESSAGE_TYPE_INFO, msg)) {
                return;
            }
            if(!this.skipMessage && messageType(MESSAGE_TYPE_INFO, msg)) {
                this.messageInfo.next(msg)
            }
            this.addRepalceMessageInArray(msg.uid, msg);
            this.messageAdded.next(msg);
        } else {
            this.logger.error('[FIREBASEConversationHandlerSERVICE] ADDED::message with uid: ', msg.uid, 'is not valid')
        }
        
    }

    /** */
    private changed(childSnapshot: any) {
        const msg = this.messageGenerate(childSnapshot);
        // imposto il giorno del messaggio per visualizzare o nascondere l'header data
        // msg.attributes && msg.attributes['subtype'] === 'info'
        if (this.skipMessage && messageType(MESSAGE_TYPE_INFO, msg)) {
            return;
        }
        this.addRepalceMessageInArray(childSnapshot.key, msg);
        this.messageChanged.next(msg);

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
        const msg: MessageModel = childSnapshot.val();
        msg.uid = childSnapshot.key;
        msg.text = msg.text.trim() //remove black msg with only spaces
        // controllo fatto per i gruppi da rifattorizzare
        if (!msg.sender_fullname || msg.sender_fullname === 'undefined') {
            msg.sender_fullname = msg.sender;
        }
        // bonifico messaggio da url
        // if (msg.type === 'text') {
        //     msg.text = htmlEntities(msg.text)
        //     msg.text = replaceEndOfLine(msg.text)
        // }

        // verifico che il sender è il logged user
        msg.isSender = isSender(msg.sender, this.loggedUser.uid);

        //check if message contains only an emojii
        // msg.emoticon = isEmojii(msg.text)

        // traduco messaggi se sono del server
        if (messageType(MESSAGE_TYPE_INFO, msg)) {
            this.translateInfoSupportMessages(msg);
        }
        return msg;
    }

    private messageCommandGenerate(message:MessageModel){
        const msg: MessageModel = message;
        msg.text = msg.text? msg.text.trim(): "";//remove black msg with only spaces
        // controllo fatto per i gruppi da rifattorizzare
        if (!msg.sender_fullname || msg.sender_fullname === 'undefined') {
            msg.sender_fullname = msg.sender;
        }
        // bonifico messaggio da url
        // if (msg.type === 'text') {
        //     msg.text = htmlEntities(msg.text)
        //     msg.text = replaceEndOfLine(msg.text)
        // }
        
        // verifico che il sender è il logged user
        msg.isSender = isSender(msg.sender, this.loggedUser.uid);
        //check if message contains only an emojii
        // msg.emoticon = isEmojii(msg.text)

        // traduco messaggi se sono del server
        if (messageType(MESSAGE_TYPE_INFO, msg)) {
            this.translateInfoSupportMessages(msg);
        }
        return msg;
    }

    /** */
    private addRepalceMessageInArray(key: string, msg: MessageModel) {
        const index = searchIndexInArrayForUid(this.messages, key);
        if (index > -1) {
            this.messages.splice(index, 1, msg);
        } else {
            this.messages.splice(0, 0, msg);
        }
        this.messages.sort(compareValues('timestamp', 'asc'));
        // aggiorno stato messaggio, questo stato indica che è stato consegnato al client e NON che è stato letto
        this.setStatusMessage(msg, this.conversationWith);
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
    private setStatusMessage(msg: MessageModel, conversationWith: string) {
        if (msg.status < MSG_STATUS_RECEIVED) {
            if (msg.sender !== this.loggedUser.uid && msg.status < MSG_STATUS_RECEIVED) {
                const urlNodeMessagesUpdate = this.urlNodeFirebase + '/' + msg.uid;
                this.logger.debug('[FIREBASEConversationHandlerSERVICE] update message status', urlNodeMessagesUpdate);
                this.firebase.database().ref(urlNodeMessagesUpdate).update({ status: MSG_STATUS_RECEIVED });
            }
        }
    }


    unsubscribe(key: string) {
        this.listSubsriptions.forEach(sub => {
            this.logger.debug('[FIREBASEConversationHandlerSERVICE] unsubscribe: ', sub.uid, key);
            if (sub.uid === key) {
                this.logger.debug('[FIREBASEConversationHandlerSERVICE] unsubscribe: ', sub.uid, key);
                sub.unsubscribe(key, null);
                return;
            }
        });
    }

    private isValidMessage(msgToCkeck:MessageModel): boolean{
        // console.log('message to check-->', msgToCkeck)
        // if(!this.isValidField(msgToCkeck.uid)){
        //     return false;
        // }
        // if(!this.isValidField(msgToCkeck.sender)){
        //     return false;
        // }
        // if(!this.isValidField(msgToCkeck.recipient)){
        //     return false;
        // }
        // if(!this.isValidField(msgToCkeck.type)){
        //     return false;
        // }else if (msgToCkeck.type === "text" && !this.isValidField(msgToCkeck.text)){
        //     return false;
        // } else if ((msgToCkeck.type === "image" || msgToCkeck.type === "file") && !this.isValidField(msgToCkeck.metadata) && !this.isValidField(msgToCkeck.metadata.src)){
        //     return false
        // }


        return true
    }

    /**
     *
     * @param field
     */
    private isValidField(field: any): boolean {
        return (field === null || field === undefined) ? false : true;
    }
}
