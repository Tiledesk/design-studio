import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// mqtt
import {Chat21Service} from './chat-service';

// models
import { ConversationModel } from '../../models/conversation';

// services
import { ConversationsHandlerService } from '../abstract/conversations-handler.service';

// utils
import { TYPE_GROUP } from '../../utils/constants';
import { getImageUrlThumbFromFirebasestorage, avatarPlaceholder, getColorBck } from '../../utils/utils-user';
import { compareValues, conversationsPathForUserId, searchIndexInArrayForUid } from '../../utils/utils';
import { ArchivedConversationsHandlerService } from '../abstract/archivedconversations-handler.service';
import { LoggerService } from '../abstract/logger.service';
import { LoggerInstance } from '../logger/loggerInstance';

@Injectable({ providedIn: 'root' })
export class MQTTArchivedConversationsHandler extends ArchivedConversationsHandlerService {

    // BehaviorSubject
    BSConversationDetail: BehaviorSubject<ConversationModel>;
    archivedConversationAdded: BehaviorSubject<ConversationModel> = new BehaviorSubject<ConversationModel>(null);
    archivedConversationChanged: BehaviorSubject<ConversationModel> = new BehaviorSubject<ConversationModel>(null);
    archivedConversationRemoved: BehaviorSubject<ConversationModel> = new BehaviorSubject<ConversationModel>(null);
    // readAllMessages: BehaviorSubject<string>;

    // public variables
    archivedConversations: Array<ConversationModel> = [];
    uidConvSelected: string;
    tenant: string;

    // private variables
    private loggedUserId: string;
    private translationMap: Map<string, string>;
    private isConversationClosingMap: Map<string, boolean>;
    private logger: LoggerService = LoggerInstance.getInstance()

    constructor(
        public chat21Service: Chat21Service
    ) {
        super();
    }

    /**
     * inizializzo conversations handler
     */
    initialize(tenant: string,  userId: string,translationMap: Map<string, string>) {
        this.logger.debug('[MQTTArchivedConversationsHandler] initialize');
        this.loggedUserId = userId;
        this.translationMap = translationMap;
        this.archivedConversations = [];
        this.isConversationClosingMap = new Map();
    }

    public getConversationDetail(conversationWith: string, callback) {
        // 1 cerco array locale
        // 2 cerco remoto
        // callback

        const conversation = this.archivedConversations.find(conv => conv.conversation_with === conversationWith);
        this.logger.log('[MQTTArchivedConversationsHandler] getConversationDetail found locally? *****: ', conversation);
        if (conversation) {
            console.log('found!');
            callback(conversation);
        } else {
            this.logger.log('[MQTTArchivedConversationsHandler] getConversationDetail Not found locally, remote.getConversationDetail *****: ', conversation);
            this.chat21Service.chatClient.archivedConversationDetail(conversationWith, (err, conversation) => {
                this.logger.log('[MQTTArchivedConversationsHandler] getConversationDetail --REMOTE CONV IS OBJ:', conversation);
                if (conversation) {
                    if (callback) {
                        callback(this.completeConversation(conversation));
                    }
                }
                else {
                    if (callback) {
                        callback(null);
                    }
                }
            })
        }
    }

    setConversationRead(conversationrecipient): void {
        // const urlUpdate = conversationsPathForUserId(this.tenant, this.loggedUserId) + '/' + conversation.recipient;
        // const update = {};
        // console.log('connect -------> conversations update', urlUpdate);
        // update['/is_new'] = false;
        // firebase.database().ref(urlUpdate).update(update);
    }

    /**
     *
     */
    // private getConversationsFromStorage() {
    //     const that = this;
    //     this.databaseProvider.getConversations()
    //     .then((conversations: [ConversationModel]) => {
    //         that.loadedConversationsStorage.next(conversations);
    //         // that.events.publish('loadedConversationsStorage', conversations);
    //     })
    //     .catch((e) => {
    //         console.log('error: ', e);
    //     });
    // }

    /**
     * connecting to conversations
     */
    // connect() {
    //     console.log('connecting MQTT conversations handler');
    //     const handlerConversationAdded = this.chat21Service.chatClient.onConversationAdded( (conv) => {
    //         console.log('conversation added:', conv.text);
    //         this.added(conv);
    //     });
    //     const handlerConversationUpdated = this.chat21Service.chatClient.onConversationUpdated( (conv) => {
    //         console.log('conversation updated:', conv.text);
    //         this.changed(conv);
    //     });
    //     const handlerConversationDeleted = this.chat21Service.chatClient.onConversationDeleted( (conv) => {
    //         console.log('conversation deleted:', conv.text);
    //         this.removed(conv);
    //     });
    //     this.chat21Service.chatClient.lastConversations( (err, conversations) => {
    //         console.log('Last conversations', conversations, 'err', err);
    //         if (!err) {
    //             conversations.forEach(conv => {
    //                 this.added(conv);
    //             });
    //         }
    //     });
    //     // SET AUDIO
    //     this.audio = new Audio();
    //     this.audio.src = URL_SOUND;
    //     this.audio.load();


    // ---------------------------------------------------------------------------------
     // New connect - renamed subscribeToConversation
     //----------------------------------------------------------------------------------
     subscribeToConversations(loaded) {
        this.logger.debug('[MQTTArchivedConversationsHandler] connecting MQTT conversations handler');
        const handlerConversationAdded = this.chat21Service.chatClient.onArchivedConversationAdded( (conv) => {
            this.logger.log('[MQTTArchivedConversationsHandler] Added conv ->', conv.text)
            this.added(conv);
        });
        // const handlerConversationUpdated = this.chat21Service.chatClient.onConversationUpdated( (conv) => {
        //     console.log('conversation updated:', conv.text);
        //     this.changed(conv);
        // });
        const handlerConversationDeleted = this.chat21Service.chatClient.onArchivedConversationDeleted( (conv) => {
            this.logger.debug('[MQTTArchivedConversationsHandler] conversation deleted:', conv);
            this.removed(conv);
        });
        this.chat21Service.chatClient.lastConversations( true, (err, conversations) => {
            this.logger.debug('[MQTTArchivedConversationsHandler] Last conversations', conversations, 'err', err);
            if (!err) {
                conversations.forEach(conv => {
                    this.added(conv);
                });
                loaded();
            }
        });
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
    /**
     * 1 -  completo la conversazione con i parametri mancanti
     * 2 -  verifico che sia una conversazione valida
     * 3 -  salvo stato conversazione (false) nell'array delle conversazioni chiuse
     * 4 -  aggiungo alla pos 0 la nuova conversazione all'array di conversazioni 
     *      o sostituisco la conversazione con quella preesistente
     * 5 -  salvo la conversazione nello storage
     * 6 -  ordino l'array per timestamp
     * 7 -  pubblico conversations:update
     */
    private added(childSnapshot: any) {
        this.logger.debug('[MQTTArchivedConversationsHandler] NEW CONV childSnapshot', childSnapshot)

        let conversation = this.completeConversation(childSnapshot);
        conversation.uid = conversation.conversation_with;
        // console.log("NUOVA CONVER;" + conversation.uid)
        if (this.isValidConversation(conversation)) {
            this.setClosingConversation(conversation.conversation_with, false);
            this.logger.debug('[MQTTArchivedConversationsHandler] conversations:', conversation.uid, this.archivedConversations);
            const index = this.searchIndexInArrayForConversationWith(this.archivedConversations, conversation.conversation_with);
            console.log("NUOVA CONVER;.uid2" + conversation.uid)
            if (index > -1) {
                this.logger.debug('[MQTTArchivedConversationsHandler] TROVATO')
                this.archivedConversations.splice(index, 1, conversation);
            } else {
                this.logger.debug('[MQTTArchivedConversationsHandler] NON TROVATO')
                this.archivedConversations.splice(0, 0, conversation);
                // this.databaseProvider.setConversation(conversation);
            }
            this.logger.debug('[MQTTArchivedConversationsHandler] NUOVA CONVER;.uid3' + conversation.uid)
            this.archivedConversations.sort(compareValues('timestamp', 'desc'));
            this.logger.debug('[MQTTArchivedConversationsHandler] TUTTE:', this.archivedConversations)
            this.archivedConversationChanged.next(conversation);
            this.archivedConversationAdded.next(conversation);
            // this.events.publish('conversationsChanged', this.conversations);
        } else {
            this.logger.error('[MQTTArchivedConversationsHandler] ChatConversationsHandler::added::conversations with conversationId: ', conversation.conversation_with, 'is not valid');
        }
    }

    searchIndexInArrayForConversationWith(conversations, conversation_with: string) {
        return conversations.findIndex(conv => conv.conversation_with === conversation_with);
    }

    /**
     * 1 -  completo la conversazione con i parametri mancanti
     * 2 -  verifico che sia una conversazione valida
     * 3 -  aggiungo alla pos 0 la nuova conversazione all'array di conversazioni 
     * 4 -  salvo la conversazione nello storage
     * 5 -  ordino l'array per timestamp
     * 6 -  pubblico conversations:update
     * 7 -  attivo sound se è un msg nuovo
     */
    // private changed(childSnapshot: any) {
    //     const childData: ConversationModel = childSnapshot.val();
    //     childData.uid = childSnapshot.key;
    //     console.log('changed conversation: ', childData);
    //     const conversation = this.completeConversation(childData);
    //     if (this.isValidConversation(conversation)) {
    //         this.setClosingConversation(childSnapshot.key, false);
    //         const index = searchIndexInArrayForUid(this.conversations, conversation.uid);
    //         if (index > -1) {
    //             this.conversations.splice(index, 1, conversation);
    //         }
    //         // this.databaseProvider.setConversation(conversation);
    //         this.conversations.sort(compareValues('timestamp', 'desc'));
    //         this.conversationChanged.next(conversation);
    //         // this.events.publish('conversationsChanged', this.conversations);
    //         this.conversationChanged.next(conversation);
    //     } else {
    //         console.error('ChatConversationsHandler::changed::conversations with conversationId: ', childSnapshot.key, 'is not valid');
    //     }
    //     if (conversation.is_new) {
    //         this.soundMessage();
    //     }
    // }

    /**
     * 1 -  cerco indice conversazione da eliminare
     * 2 -  elimino conversazione da array conversations
     * 3 -  elimino la conversazione dallo storage
     * 4 -  pubblico conversations:update
     * 5 -  elimino conversazione dall'array delle conversazioni chiuse
     */
    private removed(childSnapshot) {
        const index = searchIndexInArrayForUid(this.archivedConversations, childSnapshot.key);
        if (index > -1) {
            const conversationRemoved = this.archivedConversations[index]
            this.archivedConversations.splice(index, 1);
            // this.conversations.sort(compareValues('timestamp', 'desc'));
            // this.databaseProvider.removeConversation(childSnapshot.key);
            this.archivedConversationRemoved.next(conversationRemoved);
        }
        // remove the conversation from the isConversationClosingMap
        this.deleteClosingConversation(childSnapshot.key);
    }

    /**
     * dispose reference di conversations
     */
    dispose() {
        this.archivedConversations = [];
        this.archivedConversations.length = 0;
        this.uidConvSelected = '';
    }

    getClosingConversation(conversationId: string) {
        return this.isConversationClosingMap[conversationId];
    }

    setClosingConversation(conversationId: string, status: boolean) {
        this.isConversationClosingMap[conversationId] = status;
    }

    deleteClosingConversation(conversationId: string) {
        this.isConversationClosingMap.delete(conversationId);
    }

    archiveConversation(conversationId: string) { 
        // da implementare
    }
    
    // ---------------------------------------------------------- //
    // BEGIN FUNCTIONS 
    // ---------------------------------------------------------- //
    /**
     * Completo conversazione aggiungendo:
     * 1 -  nel caso in cui sender_fullname e recipient_fullname sono vuoti, imposto i rispettivi id come fullname,
     *      in modo da avere sempre il campo fullname popolato
     * 2 -  imposto conversation_with e conversation_with_fullname con i valori del sender o al recipient,
     *      a seconda che il sender corrisponda o meno all'utente loggato. Aggiungo 'tu:' se il sender coincide con il loggedUser
     *      Se il sender NON è l'utente loggato, ma è una conversazione di tipo GROUP, il conversation_with_fullname
     *      sarà uguale al recipient_fullname
     * 3 -  imposto stato conversazione, che indica se ci sono messaggi non letti nella conversazione
     * 4 -  imposto il tempo trascorso tra l'ora attuale e l'invio dell'ultimo messaggio
     * 5 -  imposto avatar, colore e immagine
     * @param conv
     */
    private completeConversation(conv): ConversationModel {
        // conv.selected = false;
        if (!conv.sender_fullname || conv.sender_fullname === 'undefined' || conv.sender_fullname.trim() === '') {
            conv.sender_fullname = conv.sender;
        }
        if (!conv.recipient_fullname || conv.recipient_fullname === 'undefined' || conv.recipient_fullname.trim() === '') {
            conv.recipient_fullname = conv.recipient;
        }
        let conversation_with_fullname = conv.sender_fullname;
        let conversation_with = conv.sender;
        if (conv.sender === this.loggedUserId) {
            conversation_with = conv.recipient;
            conversation_with_fullname = conv.recipient_fullname;
            conv.last_message_text = conv.last_message_text;
        } else if (conv.channel_type === TYPE_GROUP) {
            conversation_with = conv.recipient;
            conversation_with_fullname = conv.recipient_fullname;
            conv.last_message_text = conv.last_message_text;
        }
        conv.conversation_with_fullname = conversation_with_fullname;
        conv.conversation_with = conversation_with;
        conv.status = this.setStatusConversation(conv.sender, conv.uid);
        conv.avatar = avatarPlaceholder(conversation_with_fullname);
        conv.color = getColorBck(conversation_with_fullname);
        if (!conv.last_message_text) {
            conv.last_message_text = conv.text; // building conv with a message
        }
        return conv;
    }

    // /**
    //  *
    //  * @param uid
    //  */
    // private getImageUrlThumbFromFirebasestorage(uid: string) {
    //     const FIREBASESTORAGE_BASE_URL_IMAGE = this.appConfig.getConfig().FIREBASESTORAGE_BASE_URL_IMAGE;
    //     const urlStorageBucket = this.appConfig.getConfig().firebaseConfig.storageBucket + '/o/profiles%2F';
    //     const imageurl = FIREBASESTORAGE_BASE_URL_IMAGE + urlStorageBucket + uid + '%2Fthumb_photo.jpg?alt=media';
    //     return imageurl;
    // }

    /** */
    // set the remote conversation as read
    // setConversationRead(conversationUid) {
    //     var conversationRef = this.ref.ref.child(conversationUid);
    //     conversationRef.update ({"is_new" : false});
    // }

    /** */
    // getConversationByUid(conversationUid) {
    //     const index = searchIndexInArrayForUid(this.conversations, conversationUid);
    //     return this.conversations[index];
    // }

    /** */
    private setStatusConversation(sender, uid): string {
        let status = '0'; // letto
        if (sender === this.loggedUserId || uid === this.uidConvSelected) {
            status = '0';
        } else {
            status = '1'; // non letto
        }
        return status;
    }

    /**
     * restituisce il numero di conversazioni nuove
     */
    countIsNew(): number {
        let num = 0;
        this.archivedConversations.forEach((element) => {
            if (element.is_new === true) {
                num++;
            }
        });
        return num;
    }

    // ---------------------------------------------------------- //
    // END FUNCTIONS
    // ---------------------------------------------------------- //

    /**
     * attivo sound se è un msg nuovo
     */
    // private soundMessage() {
    //     console.log('****** soundMessage *****', this.audio);
    //     const that = this;
    //     // this.audio = new Audio();
    //     // this.audio.src = 'assets/pling.mp3';
    //     // this.audio.load();
    //     this.audio.pause();
    //     this.audio.currentTime = 0;
    //     clearTimeout(this.setTimeoutSound);
    //     this.setTimeoutSound = setTimeout(function () {
    //     //setTimeout(function() {
    //         that.audio.play()
    //         .then(function() {
    //             // console.log('****** then *****');
    //         })
    //         .catch(function() {
    //             // console.log('***//tiledesk-dashboard/chat*');
    //         });
    //     }, 1000);       
    // }


    /**
     *  check if the conversations is valid or not
    */
    private isValidConversation(convToCheck: ConversationModel) : boolean {
        //console.log("[BEGIN] ChatConversationsHandler:: convToCheck with uid: ", convToCheckId);
        this.logger.debug('[MQTTArchivedConversationsHandler] checking uid of', convToCheck)
        this.logger.debug('[MQTTArchivedConversationsHandler] conversation.uid', convToCheck.uid)
        this.logger.debug('[MQTTArchivedConversationsHandler] channel_type is:', convToCheck.channel_type)
        
        if (!this.isValidField(convToCheck.uid)) {
            this.logger.error('[MQTTArchivedConversationsHandler] ChatConversationsHandler::isValidConversation:: "uid is not valid" ');
            return false;
        }
        // if (!this.isValidField(convToCheck.is_new)) {
        //     this.logger.error("ChatConversationsHandler::isValidConversation:: 'is_new is not valid' ");
        //     return false;
        // }
        if (!this.isValidField(convToCheck.last_message_text)) {
            this.logger.error('[MQTTArchivedConversationsHandler] ChatConversationsHandler::isValidConversation:: "last_message_text is not valid" ');
            return false;
        }
        if (!this.isValidField(convToCheck.recipient)) {
            this.logger.error('[MQTTArchivedConversationsHandler] ChatConversationsHandler::isValidConversation:: "recipient is not valid" ');
            return false;
        }
        if (!this.isValidField(convToCheck.recipient_fullname)) {
            this.logger.error('[MQTTArchivedConversationsHandler] ChatConversationsHandler::isValidConversation:: "recipient_fullname is not valid" ');
            return false;
        }
        if (!this.isValidField(convToCheck.sender)) {
            this.logger.error('[MQTTArchivedConversationsHandler] ChatConversationsHandler::isValidConversation:: "sender is not valid" ');
            return false;
        }
        if (!this.isValidField(convToCheck.sender_fullname)) {
            this.logger.error('[MQTTArchivedConversationsHandler] ChatConversationsHandler::isValidConversation:: "sender_fullname is not valid" ');
            return false;
        }
        if (!this.isValidField(convToCheck.status)) {
            this.logger.error('[MQTTArchivedConversationsHandler] ChatConversationsHandler::isValidConversation:: "status is not valid" ');
            return false;
        }
        if (!this.isValidField(convToCheck.timestamp)) {
            this.logger.error('[MQTTArchivedConversationsHandler] ChatConversationsHandler::isValidConversation:: "timestamp is not valid" ');
            return false;
        }
        if (!this.isValidField(convToCheck.channel_type)) {
            this.logger.error('[MQTTArchivedConversationsHandler] ChatConversationsHandler::isValidConversation:: "channel_type is not valid" ');
            return false;
        }
        //console.log("[END] ChatConversationsHandler:: convToCheck with uid: ", convToCheckId);
        // any other case
        return true;
    }

    // checks if a conversation's field is valid or not
    private isValidField(field) : boolean{
        return (field === null || field === undefined) ? false : true;
    }

}