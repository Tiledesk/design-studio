import { Injectable, ɵConsole } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

import { LoggerService } from '../abstract/logger.service';
import { LoggerInstance } from '../logger/loggerInstance';

// services
// import { EventsService } from '../events-service';
import { MessagingAuthService } from '../abstract/messagingAuth.service';
import { Chat21Service } from './chat-service';
// models
import { UserModel } from '../../models/user';
import { avatarPlaceholder, getColorBck } from 'src/chat21-core/utils/utils-user';
import { AppStorageService } from '../abstract/app-storage.service';

// declare var Chat21Client: any;


@Injectable({ providedIn: 'root' })
export class MQTTAuthService extends MessagingAuthService {
  
  // BehaviorSubject
  BSAuthStateChanged: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  BSSignOut: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  SERVER_BASE_URL: string;

  public token: any;
  public tiledeskToken: any;
  public user: any;
  private currentUser: any;

  // private 
  private URL_TILEDESK_CREATE_CUSTOM_TOKEN: string;

  private logger: LoggerService = LoggerInstance.getInstance()

  constructor(
    public http: HttpClient,
    public chat21Service: Chat21Service,
    public appStorage: AppStorageService
  ) {
    super();
  }

  /**
   *
   */
  initialize() {
    this.SERVER_BASE_URL = this.getBaseUrl();
    this.URL_TILEDESK_CREATE_CUSTOM_TOKEN = this.SERVER_BASE_URL + 'chat21/native/auth/createCustomToken';
    this.logger.log('[MQTTAuthService] initialize ');
    // this.checkIsAuth();
    // this.onAuthStateChanged();
  }

  // logout(callback) {
  logout(): Promise<boolean> {
    this.logger.debug("[MQTTAuthService] logout: closing mqtt connection...");
    return new Promise((resolve, reject) => {
      this.chat21Service.chatClient.close(() => {
        // remove
        // this.appStorage.removeItem('tiledeskToken');
        // this.appStorage.removeItem('currentUser');
        this.currentUser = null;
        this.logger.debug("[MQTTAuthService] logout: mqtt connection closed. user removed. OK");
        this.BSSignOut.next(true);
        this.BSAuthStateChanged.next('offline');
        resolve(true)
        // if (callback) {
        //   callback();
        // }
      });
    });
  }

  /**
   *
   */
  getUser(): any {
    return this.currentUser;
  }

z

  /** */
  getToken(): string {
    this.logger.debug('[MQTTAuthService]::getToken');
    return this.token;
  }

  /**
   */
  // onAuthStateChanged() {
  //   this.logger.log('UserService::onAuthStateChanged');
  //   // if (this.appStorage.getItem('tiledeskToken') == null) {
  //   //   this.currentUser = null;
  //   this.BSAuthStateChanged.next('offline');
  //   // }

  //   // this.logger.log("STORAGE CHANGED: added listner")
  //   // window.addEventListener('storage', (e) => {
  //   //   this.logger.log('STORAGE CHANGED:', e.key);
  //   //   if (this.appStorage.getItem('tiledeskToken') == null && this.appStorage.getItem('currentUser') == null) {
  //   //     this.logger.log('STORAGE CHANGED: CASO TOKEN NULL');
  //   //     this.currentUser = null;
  //   //     // that.logout(() => {
  //   //     //   that.BSAuthStateChanged.next('offline');
  //   //     // });
  //   //     this.logout();
  //   //   }
  //   //   else if (this.currentUser == null && this.appStorage.getItem('tiledeskToken') != null && this.appStorage.getItem('currentUser') != null) {
  //   //     this.logger.log('STORAGE CHANGED: CASO LOGGED OUTSIDE');
  //   //     this.currentUser = JSON.parse(this.appStorage.getItem('currentUser'));
  //   //     const tiledeskToken = this.appStorage.getItem('tiledeskToken');
  //   //     this.connectWithCustomToken(tiledeskToken);
  //   //   }
  //   // }, false);

  // }

  createCustomToken(tiledeskToken: any): void {
    this.connectWithCustomToken(tiledeskToken)
  }

  // createCustomToken(tiledeskToken: any): void {
  //   const headers = new HttpHeaders({
  //     'Content-type': 'application/json',
  //     Authorization: tiledeskToken
  //   });
  //   const responseType = 'text';
  //   const postData = {};
  //   const that = this;
  //   this.http.post(this.URL_TILEDESK_CREATE_CUSTOM_TOKEN, postData, { headers, responseType})
  //   .subscribe(data =>  {
  //     that.getCustomToken(data);
  //   }, error => {
  //     this.logger.log(error);
  //   });
  // }

  // ********************* NATIVE AUTH (NO TILEDESK) ********************* //
  // private signinMQTT(url: string, username: string, password: string) {
  //   this.logger.log("signinMQTT...")
  //   const httpHeaders = new HttpHeaders();
  //   httpHeaders.append('Accept', 'application/json');
  //   httpHeaders.append('Content-Type', 'application/json' );
  //   const requestOptions = { headers: httpHeaders };
  //   const postData = {
  //     username: username,
  //     password: password
  //   };
  //   const that = this;
  //   this.http.post(url, postData, requestOptions)
  //     .subscribe(data => {
  //       this.logger.log("native auth data:", JSON.stringify(data));
  //       if (data['token'] && data['userid']) {
  //         this.appStorage.setItem('tiledeskToken', data['token']);
  //         this.tiledeskToken = data['token'];
  //         data['_id'] = data['userid'];
  //         this.createCompleteUser(data);
  //         that.connectMQTT(data);
  //         // that.firebaseCreateCustomToken(tiledeskToken);
  //       }
  //     }, error => {
  //       this.logger.log(error);
  //     });
  // }

  /**
   * @param tiledeskToken
   */
  // signInWithCustomToken(tiledeskToken: string): Promise<any>{
  //   const headers = new HttpHeaders({
  //     'Content-type': 'application/json',
  //     Authorization: tiledeskToken
  //   });
  //   const requestOptions = { headers: headers };
  //   // const that = this;
  //   return new Promise((resolve, reject)=> {
  //     this.http.post(this.URL_TILEDESK_SIGNIN_WITH_CUSTOM_TOKEN, null, requestOptions).subscribe((data) => {
  //       if (data['success'] && data['token']) {
  //         this.tiledeskToken = data['token'];
  //         // this.createCompleteUser(data['user']);
  //         this.appStorage.setItem('tiledeskToken', this.tiledeskToken);
  //         this.connectWithCustomToken(this.tiledeskToken);
  //         resolve(this.currentUser)
  //       }
  //     }, (error) => {
  //       this.logger.log(error);
  //       reject(error)
  //     });
  //   });
  // }



  // private signIn(url: string, emailVal: string, pswVal: string) {
  //   const httpHeaders = new HttpHeaders();
  //   httpHeaders.append('Accept', 'application/json');
  //   httpHeaders.append('Content-Type', 'application/json' );
  //   const requestOptions = { headers: httpHeaders };
  //   const postData = {
  //     email: emailVal,
  //     password: pswVal
  //   };
  //   // const that = this;
  //   this.http.post(url, postData, requestOptions)
  //     .subscribe(data => {
  //       this.logger.log("data:", JSON.stringify(data));
  //       if (data['success'] && data['token']) {
  //         this.tiledeskToken = data['token'];
  //         this.createCompleteUser(data['user']);
  //         this.appStorage.setItem('tiledeskToken', this.tiledeskToken);
  //         this.connectWithCustomToken(this.tiledeskToken);
  //         // that.firebaseCreateCustomToken(tiledeskToken);
  //       }
  //     }, error => {
  //       this.logger.log(error);
  //     });
  // }

  // private createCustomToken(tiledeskToken: string) {
  //   const headers = new HttpHeaders({
  //     'Content-type': 'application/json',
  //     Authorization: tiledeskToken
  //   });
  //   const responseType = 'text';
  //   const postData = {};
  //   const that = this;
  //   this.http.post(this.URL_TILEDESK_CREATE_CUSTOM_TOKEN, postData, { headers, responseType})
  //   .subscribe(data =>  {
  //     that.getCustomToken(data);
  //   }, error => {
  //     this.logger.log(error);
  //   });
  // }

  private connectWithCustomToken(tiledeskToken: string): any {
    const headers = new HttpHeaders({
      'Content-type': 'application/json',
      Authorization: tiledeskToken
    });
    const responseType = 'text';
    const postData = {};
    // const that = this;
    this.http.post(this.URL_TILEDESK_CREATE_CUSTOM_TOKEN, postData, { headers, responseType})
    .subscribe(data =>  {
      this.logger.debug("[MQTTAuthService] connectWithCustomToken: **** data", data)
      const result = JSON.parse(data);
      this.connectMQTT(result);
    }, error => {
      this.logger.error(error);
    });
  }

  connectMQTT(credentials: any): any {
    this.logger.debug('[MQTTAuthService] connectMQTT: **** credentials:', credentials);
    const userid = credentials.userid;
    this.chat21Service.chatClient.connect(userid, credentials.token, () => {
      this.logger.debug('[MQTTAuthService] connectMQTT: Chat connected.');
      this.BSAuthStateChanged.next('online');
    });
  }

  // /**
  //  * createCompleteUser
  //  * @param user
  //  */
  // private createCompleteUser(user: any) {
  //   const member = new UserModel(user._id);
  //   try {
  //     const uid = user._id;
  //     const firstname = user.firstname ? user.firstname : '';
  //     const lastname = user.lastname ? user.lastname : '';
  //     const email = user.email ? user.email : '';
  //     const fullname = ( firstname + ' ' + lastname ).trim();
  //     const avatar = avatarPlaceholder(fullname);
  //     const color = getColorBck(fullname);
  //     //TODO-GAB
  //     // const imageurl = this.imageRepo.getImageThumb(uid);

  //     member.uid = uid;
  //     member.email = email;
  //     member.firstname = firstname;
  //     member.lastname = lastname;
  //     member.fullname = fullname;
  //     //TODO-GAB
  //     // member.imageurl = imageurl;
  //     member.avatar = avatar;
  //     member.color = color;
  //     this.logger.log('createCompleteUser: ', member);
  //   } catch (err) {
  //     this.logger.log('createCompleteUser error:' + err);
  //   }
  //   this.logger.log('createCompleteUser: ', member);
  //   this.currentUser = member;
  //   // salvo nel local storage e sollevo l'evento
  //   this.appStorage.setItem('currentUser', JSON.stringify(this.currentUser));
  // }
}
