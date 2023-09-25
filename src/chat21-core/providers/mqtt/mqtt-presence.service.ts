import { Inject, Injectable, Optional } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// firebase
import * as firebase from 'firebase/app';
import 'firebase/messaging';
import 'firebase/database';

// services
// import { EventsService } from '../events-service';
import { PresenceService } from '../abstract/presence.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from '../logger/loggerInstance';
import { Chat21Service } from './chat-service';


@Injectable({
  providedIn: 'root'
})
export class MQTTPresenceService extends PresenceService {

  // BehaviorSubject
  BSIsOnline: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  BSLastOnline: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  // private params
  private tenant: string;
  private urlNodePresence: string;
  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    public chat21Service: Chat21Service,
    @Optional() @Inject('webSocketService') public webSocketService?: any,
  ) {
    super();
  }

  initialize(tenant: string) {
    // this.tenant = this.getTenant();
    this.tenant = tenant;
    this.logger.info('[MQTT-PRESENCE] initialize this.tenant', this.tenant);
    this.urlNodePresence = '/apps/' + this.tenant + '/presence/';
  }

  userIsOnline(userid: string): Observable<any> {
    const that = this;
    let local_BSIsOnline = new BehaviorSubject<any>(null);
    this.webSocketService.wsRequesterStatus$.subscribe((data: any) => {
    // this.logger.log('[NATIVEPresenceSERVICE] $subs to wsService - data ', data, userid);
    if (data && data.presence && data.presence.status === 'online' ) {
        that.BSIsOnline.next({ uid: data.uuid_user, isOnline: true });
        local_BSIsOnline.next({ uid: data.uuid_user, isOnline: true });
    } else {
        that.BSIsOnline.next({ uid: data.uuid_user, isOnline: false });
        local_BSIsOnline.next({ uid: data.uuid_user, isOnline: false });
    }
    });

    return local_BSIsOnline
  }

  lastOnlineForUser(userid: string) {
    // console.log('lastOnlineForUser', userid);
    // const that = this;
    // const urlNodeLastOnLine = this.urlNodePresence + userid + '/lastOnline';
    // console.log('urlNodeLastOnLine: ', urlNodeLastOnLine);
    // const lastOnlineRef = firebase.database().ref().child(urlNodeLastOnLine);
    // lastOnlineRef.on('value', (child) => {
    //   if (child.val()) {
    //     that.events.publish('last-connection-date-' + userid, userid, child.val());
    //   } else {
    //     that.events.publish('last-connection-date-' + userid, userid, '');
    //   }
    // });
  }

  public setPresence(userid: string): void  {
    // console.log(' setPresence: ', userid);
    // this.onlineConnectionsRef = this.referenceOnlineForUser(userid);
    // this.lastOnlineConnectionsRef = this.referenceLastOnlineForUser(userid);
    // const connectedRefURL = '/.info/connected';
    // const conn = firebase.database().ref(connectedRefURL);
    // conn.on('value', (dataSnapshot) => {
    //   // console.log('self.deviceConnectionRef: ', dataSnapshot.val());
    //   if (dataSnapshot.val()) {
    //     if (this.onlineConnectionsRef) {
    //       this.keyConnectionRef = this.onlineConnectionsRef.push(true);
    //       this.keyConnectionRef.onDisconnect().remove();
    //       const now: Date = new Date();
    //       const timestamp = now.valueOf();
    //       this.lastOnlineConnectionsRef.onDisconnect().set(timestamp);
    //     } else {
    //       console.log('This is an error. self.deviceConnectionRef already set. Cannot be set again.');
    //     }
    //   }
    // });
  }

  public imHere(): void {
    this.logger.debug('[MQTT-PRESENCE] imHere', this.tenant);
    setTimeout(() => {
      this.chat21Service.chatClient.ImHere()
    }, 2000);
  }

  /**
   * removePresence
   * richiamato prima del logout
   */
  public removePresence(): void {
    // if (this.onlineConnectionsRef) {
    //   const now: Date = new Date();
    //   const timestamp = now.valueOf();
    //   this.lastOnlineConnectionsRef.set(timestamp);
    //   this.onlineConnectionsRef.off();
    //   this.onlineConnectionsRef.remove();
    //   console.log('goOffline onlineConnectionsRef', this.onlineConnectionsRef);
    // }
  }

}


  /**
   * controlla se esiste una connessione per l'utente analizzato,
   * verificando se esiste un nodo in presence/uid/connections
   * mi sottosrivo al nodo
   * se non esiste pubblico utente offline
   * se esiste pubblico utente online
   * @param userid
   */


  /**
   * mi sottoscrivo al nodo presence/uid/lastOnline
   * e recupero la data dell'ultimo stato online
   * pubblico lastConnectionDate
   * @param userid
   */


  /**
   * calcolo tempo trascorso tra ora e timestamp passato
   * @param timestamp
   */


  // /**
  //  * recupero la reference di lastOnline del currentUser
  //  * usata in setupMyPresence
  //  * @param userid
  //  */
  // lastOnlineRefForUser(userid){
  //   let lastOnlineRefURL = this.urlNodeFirebase+"/presence/"+userid+"/lastOnline";
  //   const lastOnlineRef = firebase.database().ref().child(lastOnlineRefURL);
  //   return lastOnlineRef;
  // }

  // /**
  //  * recupero la reference di connections (online/offline) del currentUser
  //  * usata in setupMyPresence
  //  * @param userid
  //  */
  // onlineRefForUser(userid){
  //   let myConnectionsRefURL = this.urlNodeFirebase+"/presence/"+userid+"/connections";
  //   const connectionsRef = firebase.database().ref().child(myConnectionsRefURL);
  //   return connectionsRef;
  // }

  // /**
  //  * 1 - imposto reference online/offline
  //  * 2 - imposto reference lastConnection
  //  * 3 - mi sincronizzo con /.info/connected
  //  * 4 - se il valore esiste l'utente è online
  //  * 5 - aggiungo nodo a connection (true)
  //  * 6 - aggiungo job su onDisconnect di deviceConnectionRef che rimuove nodo connection 
  //  * 7 - aggiungo job su onDisconnect di lastOnlineRef che imposta timestamp
  //  * 8 - salvo reference connected nel singlelton !!!!! DA FARE
  //  * @param userid
  //  */
  // setupMyPresence(userid){
  //   let that = this;
  //   this.myConnectionsRef = this.onlineRefForUser(userid);
  //   this.lastOnlineRef = this.lastOnlineRefForUser(userid);
  //   let connectedRefURL = "/.info/connected";
  //   let conn = firebase.database().ref(connectedRefURL);
  //   conn.on('value', function(dataSnapshot) {
  //     //console.log("KEY: ",dataSnapshot,that.deviceConnectionRef);
  //     if(dataSnapshot.val()){
  //       console.log("self.deviceConnectionRef: ", that.myConnectionsRef);
  //       //if (!that.myConnectionsRef || that.myConnectionsRef==='undefined') {
  //       if (that.myConnectionsRef) {
  //         //this.deviceConnectionRef = myConnectionsRef.set(true);
  //         let conection = true;
  //         //that.deviceConnectionRef = 
  //         const keyMyConnectionRef = that.myConnectionsRef.push(conection);
  //         //!!! quando faccio logout devo disconnettermi
  //         keyMyConnectionRef.onDisconnect().remove();
  //         // when I disconnect, update the last time I was seen online
  //         let now: Date = new Date();
  //         let timestamp = now.valueOf();
  //         that.lastOnlineRef.onDisconnect().set(timestamp);
  //       } else {
  //         console.log("This is an error. self.deviceConnectionRef already set. Cannot be set again.");
  //       }
  //     }
  //   });
  // }

  /**
   * rimuovo la references su lastOnline
   * rimuovo la references su connection
   */
  // goOffline() {
  //   console.log("goOffline.", this.myConnectionsRef)
  //   // this.removeConnectionReference();
  //   this.removeLastOnlineReference();
  // }

  // removeConnectionReference(){
  //   if(this.myConnectionsRef){
  //     this.myConnectionsRef.off();
  //     console.log("goOffline 1", this.myConnectionsRef)
  //     this.myConnectionsRef.remove();
  //     console.log("goOffline 2", this.myConnectionsRef)
  //   }
  //   this.myConnectionsRef = null;
  // }

//   removeLastOnlineReference(){
//     if(this.lastOnlineRef){
//       this.lastOnlineRef.off();
//       this.lastOnlineRef.remove();
//     }
//     this.lastOnlineRef = null;
//   }
// }
