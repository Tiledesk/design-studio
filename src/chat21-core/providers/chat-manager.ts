import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// models
import { UserModel } from './../models/user';

// handlers
import { ConversationHandlerService } from './../providers/abstract/conversation-handler.service';
import { ConversationsHandlerService } from './../providers/abstract/conversations-handler.service';

import { environment } from '../../environments/environment';
import { ArchivedConversationsHandlerService } from './../providers/abstract/archivedconversations-handler.service';
import { AppConfigService } from 'src/app/services/app-config';

// Logger
import { LoggerService } from './abstract/logger.service';
import { LoggerInstance } from './logger/loggerInstance';


@Injectable({ providedIn: 'root' })

export class ChatManager {

  BSStart: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  // supportMode = environment.supportMode;
  // tenant = environment.tenant;
  tenant: string
 

  private currentUser: UserModel;
  private tiledeskToken: string;

  private handlers: ConversationHandlerService[];
  public openInfoConversation: boolean;
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public conversationsHandlerService: ConversationsHandlerService,
    public archivedConversationsService: ArchivedConversationsHandlerService,
    public appConfigService: AppConfigService,
  ) { }
  /**
   * inizializza chatmanager
   */
  initialize() {
    const appconfig = this.appConfigService.getConfig();
    this.tenant = appconfig.firebaseConfig.tenant;
    this.logger.log('[CHAT MANAGER] - initialize -> firebaseConfig tenant ', this.tenant);
    this.handlers = [];
    this.openInfoConversation = true;
    this.currentUser = null;
    this.logger.log('[CHAT MANAGER]- initialize -> this.handlers', this.handlers);
  }

  /**
   * setTiledeskToken
   */
  public setTiledeskToken(tiledeskToken: string) {
    this.logger.log('initialize FROM [APP-COMP] - [CHAT MANAGER] - initialize -> firebaseConfig tenant ', this.tenant);
    this.tiledeskToken = tiledeskToken;
  }

  /**
   * return tiledeskToken
   */
  public getTiledeskToken(): string {
    return this.tiledeskToken;
  }

  /**
   * setCurrentUser
   */
  public setCurrentUser(currentUser: UserModel) {
    this.logger.log('initialize FROM [APP-COMP] - [CHAT MANAGER] setCurrentUser currentUser ', currentUser)
    this.currentUser = currentUser;
  }

  /**
   * return current user detail
   */
  public getCurrentUser(): UserModel {
    return this.currentUser;
  }

  public startApp() {
    this.BSStart.next(this.currentUser);
  }
  /**
   *
   */
  getOpenInfoConversation(): boolean {
    return this.openInfoConversation;
  }
  /**
   * dispose all references
   * dispose refereces messaggi di ogni conversazione
   * dispose reference conversazioni
   * dispose reference sincronizzazione contatti
   */
  dispose() {
    this.logger.debug('[CHAT MANAGER] 1 - setOffAllReferences');
    if (this.handlers) { this.setOffAllReferences(); }
    this.logger.debug('[CHAT MANAGER] 2 - disposeConversationsHandler');
    if (this.conversationsHandlerService) { this.disposeConversationsHandler(); }
    this.logger.debug('[CHAT MANAGER] 3 - disposeArchivedConversationsHandler');
    if (this.archivedConversationsService) { this.disposeArchivedConversationsHandler(); }
    this.logger.debug('[CHAT MANAGER] 4 - disposeContactsSynchronizer');
    // if (this.contactsSynchronizer) { this.disposeContactsSynchronizer(); }
    this.logger.debug('[CHAT MANAGER] OKK ');
    this.conversationsHandlerService = null;
    this.archivedConversationsService = null;
    // this.contactsSynchronizer = null;
  }

  /**
   * invocato da user.ts al LOGIN:
   * LOGIN:
   * 1 - imposto lo stato di connessione utente
   * 2 - aggiungo il token
   * 3 - pubblico stato loggedUser come login
   */
  // goOnLine(user) {
  //   if (user) {
  //     const uid = user.uid;
  //     this.loggedUser = new UserModel(uid);
  //     this.logger.('[CHAT MANAGER]goOnLine::: ', this.loggedUser);
  //     this.loadCurrentUserDetail();
  //     if (this.supportMode === false) {
  //       //this.initContactsSynchronizer();
  //     }
  //   }
  // }


  

  /** */
  // loadCurrentUserDetail() {
  //   const that = this;
  //   this.userService.loadCurrentUserDetail()
  //   .then((snapshot: any) => {
  //     if (snapshot.val()) {
  //       this.logger.('[CHAT MANAGER]loadCurrentUserDetail::: ', snapshot.val());
  //       that.completeProfile(snapshot.val());
  //       that.events.publish('loaded-current-user', snapshot.val());
  //     }
  //   })
  //   .catch((err: Error) => {
  //     this.logger.('[CHAT MANAGER]Unable to get permission to notify.', err);
  //   });
  // }

  /**
   * invocato da user.ts al LOGOUT:
   * 1 - cancello tutte le references
   * 2 - pubblico stato loggedUser come logout
   */
  goOffLine() {
    this.currentUser = null;
    // cancello token e user dal localstorage!!!!!
    this.logger.debug('[CHAT MANAGER] 1 - CANCELLO TUTTE LE REFERENCES');
    this.dispose();
  }

  /// START metodi gestione messaggi conversazione ////
  /**
   * aggiungo la conversazione all'array delle conversazioni
   * chiamato dall'inizialize di dettaglio-conversazione.ts
   * @param handler
   */
  addConversationHandler(handler: ConversationHandlerService) {
    this.logger.debug('[CHAT MANAGER] -----> addConversationHandler', this.handlers, handler);
    this.handlers.push(handler);
  }

  /**
   * rimuovo dall'array degli handlers delle conversazioni una conversazione
   * al momento non è utilizzato!!!
   * @param conversationId
   */
  removeConversationHandler(conversationId) {
    this.logger.debug('[CHAT MANAGER] -----> removeConversationHandler: ', conversationId);
    const index = this.handlers.findIndex(i => i.conversationWith === conversationId);
    this.handlers.splice(index, 1);
  }

  /**
   * cerco e ritorno una conversazione dall'array delle conversazioni
   * con conversationId coincidente con conversationId passato
   * chiamato dall'inizialize di dettaglio-conversazione.ts
   * @param conversationId
   */
  getConversationHandlerByConversationId(conversationId): any {
    let handler = null;
    this.handlers.forEach(conv => {
      // this.logger.('[CHAT MANAGER]forEach ***', conversationId, this.handlers, conv);
      if (conv.conversationWith === conversationId) {
        handler = conv;
        return;
      }
    });
    return handler;
    // const resultArray = this.handlers.filter((handler) => {
    //   this.logger.('[CHAT MANAGER]FILTRO::: ***', conversationId, handler.conversationWith);
    //   return handler.conversationWith === conversationId;
    // });

   
    // if (resultArray.length === 0) {
    //   return null;
    // }
    // return resultArray[0];
  }

  /**
   * elimino tutti gli hendler presenti nell'array handlers
   * dopo aver cancellato la reference per ogni handlers
   */
  setOffAllReferences() {
    this.handlers.forEach((data) => {
      // const item = data.ref;
      // item.ref.off();
    });
    this.handlers = [];
  }
  /// END metodi gestione messaggi conversazione ////

  /// START metodi gestione conversazioni ////
  /**
   * Salvo il CONVERSATIONS handler dopo averlo creato nella lista conversazioni
   */
  setConversationsHandler(handler) {
    this.conversationsHandlerService = handler;
  }
  setArchivedConversationsHandler(handler) {
    this.archivedConversationsService = handler;
  }

  /**
   * elimino la reference dell'handler delle conversazioni
   */
  disposeConversationsHandler() {
    this.logger.debug('[CHAT MANAGER] 2 - this.conversationsHandler:: ', this.conversationsHandlerService);
    this.conversationsHandlerService.dispose();
  }

  /**
   * elimino la reference dell'handler delle conversazioni archiviate
   */
  disposeArchivedConversationsHandler() {
    this.logger.debug('[CHAT MANAGER] 3 - this.archivedConversationsService:: ', this.archivedConversationsService);
    this.archivedConversationsService.dispose();
  }
  /// END metodi gestione conversazioni ////

  /// START metodi sincronizzazione contatti ////
  /**
   * creo handler sincronizzazione contatti se ancora nn esiste
   * inizio la sincronizzazione
   */
  // initContactsSynchronizer() {
  //   this.logger.('[CHAT MANAGER] initContactsSynchronizer:: ', this.contactsSynchronizer, this.tenant, this.currentUser);
  //   if (!this.contactsSynchronizer) {
  //     this.contactsSynchronizer = this.chatContactsSynchronizer.initWithTenant(this.tenant, this.currentUser);
  //     //this.contactsSynchronizer = this.createContactsSynchronizerForUser();
  //     this.contactsSynchronizer.startSynchro();
  //   } else {
  //     this.contactsSynchronizer.startSynchro();
  //   }
  // }
  /**
   * elimino la reference dell'handler della sincronizzazione contatti
   */
  // disposeContactsSynchronizer() {
  //   this.contactsSynchronizer.dispose();
  // }
  /// END metodi sincronizzazione contatti ////



}
