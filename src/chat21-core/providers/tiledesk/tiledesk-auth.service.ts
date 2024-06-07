import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UserModel } from 'src/chat21-core/models/user';
import { avatarPlaceholder, getColorBck } from 'src/chat21-core/utils/utils-user';
import { AppStorageService } from '../abstract/app-storage.service';
import { LoggerInstance } from '../logger/loggerInstance';
import { BehaviorSubject } from 'rxjs';
// import { BehaviorSubject } from 'rxjs';
// import { EventsService } from 'src/app/services/events-service';


@Injectable({
  providedIn: 'root'
})
export class TiledeskAuthService {

  // private persistence: string;
  public SERVER_BASE_URL: string;

  // private
  private URL_TILEDESK_SIGNIN: string;
  private URL_TILEDESK_SIGNIN_ANONYMOUSLY: string;
  private URL_TILEDESK_SIGNIN_WITH_CUSTOM_TOKEN: string;

  private tiledeskToken: string;
  private currentUser: UserModel;
  private logger: LoggerService = LoggerInstance.getInstance()

  private BS_IsONLINE: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false)

  constructor(
    public http: HttpClient,
    public appStorage: AppStorageService,
    // private events: EventsService,
  ) { }


  initialize(serverBaseUrl: string) {
    this.logger.log('[TILEDESK-AUTH-SERV] - initialize serverBaseUrl', serverBaseUrl);
    this.SERVER_BASE_URL = serverBaseUrl;
    this.URL_TILEDESK_SIGNIN = this.SERVER_BASE_URL + 'auth/signin';
    this.URL_TILEDESK_SIGNIN_ANONYMOUSLY = this.SERVER_BASE_URL + 'auth/signinAnonymously'
    this.URL_TILEDESK_SIGNIN_WITH_CUSTOM_TOKEN = this.SERVER_BASE_URL + 'auth/signinWithCustomToken';
  }


  /**
   * @param email
   * @param password
   */
  signInWithEmailAndPassword(email: string, password: string): Promise<string> {
    this.logger.log('[TILEDESK-AUTH-SERV] - signInWithEmailAndPassword', email, password);
    const httpHeaders = new HttpHeaders();

    httpHeaders.append('Accept', 'application/json');
    httpHeaders.append('Content-Type', 'application/json');
    const requestOptions = { headers: httpHeaders };
    const postData = {
      email: email,
      password: password
    };
    const that = this;
    return new Promise((resolve, reject) => {
      this.http.post(this.URL_TILEDESK_SIGNIN, postData, requestOptions).subscribe((data) => {
        if (data['success'] && data['token']) {
          that.tiledeskToken = data['token'];
          that.createCompleteUser(data['user']);
          this.checkAndSetInStorageTiledeskToken(that.tiledeskToken)
          this.BS_IsONLINE.next(true)
          resolve(that.tiledeskToken)
        }
      }, (error) => {
        reject(error)
      });
    });
  }


  /**
   * @param projectID
   */
  signInAnonymously(projectID: string): Promise<any> {
    this.logger.debug('[TILEDESK-AUTH] - signInAnonymously - projectID', projectID);
    const httpHeaders = new HttpHeaders();

    httpHeaders.append('Accept', 'application/json');
    httpHeaders.append('Content-Type', 'application/json');
    const requestOptions = { headers: httpHeaders };
    const postData = {
      id_project: projectID
    };
    const that = this;
    return new Promise((resolve, reject) => {
      this.http.post(this.URL_TILEDESK_SIGNIN_ANONYMOUSLY, postData, requestOptions).subscribe({next: (data) => {
        if (data['success'] && data['token']) {
          that.tiledeskToken = data['token'];
          that.createCompleteUser(data['user']);
          this.checkAndSetInStorageTiledeskToken(that.tiledeskToken)
          this.BS_IsONLINE.next(true)
          resolve(that.tiledeskToken)
        }
      }, error: (error) => {
        reject(error)
      }});
    })

  }

  /**
   * @param tiledeskToken
   */
  signInWithCustomToken(tiledeskToken: string): Promise<any> {
    const headers = new HttpHeaders({
      'Content-type': 'application/json',
      Authorization: tiledeskToken
    });
    const requestOptions = { headers: headers };
    const that = this;
    return new Promise((resolve, reject) => {
      this.http.post(this.URL_TILEDESK_SIGNIN_WITH_CUSTOM_TOKEN, null, requestOptions).subscribe({next: (data)=>{
        if (data['success'] && data['token']) {
          that.tiledeskToken = data['token'];
          that.createCompleteUser(data['user']);
          this.checkAndSetInStorageTiledeskToken(that.tiledeskToken)
          this.BS_IsONLINE.next(true)
          resolve(this.currentUser)
        }
      }, error: (error)=>{
        reject(error)
      }})
    });
  }

  logOut() {
    this.logger.log('[TILEDESK-AUTH] - LOGOUT')
    this.appStorage.removeItem('tiledeskToken')
    this.appStorage.removeItem('currentUser')
    localStorage.removeItem('tiledesk_token')
    this.BS_IsONLINE.next(false)
    this.setCurrentUser(null);
    this.setTiledeskToken(null);
    // this.isOnline$.next(false) 
    const stored_project = localStorage.getItem('last_project')
    if (stored_project) {
      localStorage.removeItem('last_project')
    }
    const stored_contacts = localStorage.getItem('contacts')
    if (stored_contacts) {
      localStorage.removeItem('contacts')
    }
  }


  /**
   * createCompleteUser
   * @param user
   */
  private createCompleteUser(user: any) {
    const member = new UserModel(user._id);
    try {
      const uid = user._id;
      const firstname = user.firstname ? user.firstname : '';
      const lastname = user.lastname ? user.lastname : '';
      const email = user.email ? user.email : '';
      const fullname = (firstname + ' ' + lastname).trim();
      const avatar = avatarPlaceholder(fullname);
      const color = getColorBck(fullname);

      member.uid = uid;
      member.email = email;
      member.firstname = firstname;
      member.lastname = lastname;
      member.fullname = fullname;
      member.avatar = avatar;
      member.color = color;
      this.currentUser = member;
      this.logger.log('[TILEDESK-AUTH] - createCompleteUser member ', member);
      this.appStorage.setItem('currentUser', JSON.stringify(this.currentUser));

    } catch (err) {
      this.logger.error('[TILEDESK-AUTH]- createCompleteUser ERR ', err)
    }
  }


  private checkAndSetInStorageTiledeskToken(tiledeskToken) {
    this.logger.log('[TILEDESK-AUTH] - checkAndSetInStorageTiledeskToken tiledeskToken from request', tiledeskToken)
    const storedTiledeskToken = localStorage.getItem('tiledesk_token');
    this.logger.log('[TILEDESK-AUTH] - checkAndSetInStorageTiledeskToken storedTiledeskToken ', storedTiledeskToken)
    if (!storedTiledeskToken) {
      this.logger.log('[TILEDESK-AUTH] - checkAndSetInStorageTiledeskToken TOKEN DOES NOT EXIST - RUN SET ')
      localStorage.setItem('tiledesk_token', tiledeskToken)
    } else if (storedTiledeskToken && storedTiledeskToken !== tiledeskToken) {
      this.logger.log('[TILEDESK-AUTH] - checkAndSetInStorageTiledeskToken STORED-TOKEN EXIST BUT IS != FROM TOKEN - RUN SET ')
      localStorage.setItem('tiledesk_token', tiledeskToken)
    } else if (storedTiledeskToken && storedTiledeskToken === tiledeskToken) {
      this.logger.log('[TILEDESK-AUTH] - checkAndSetInStorageTiledeskToken STORED-TOKEN EXIST AND IS = TO TOKEN ')
    }
    this.appStorage.setItem('tiledeskToken', tiledeskToken)
  }

  isLoggedIn(): Promise<boolean>{
    return new Promise<boolean>((resolve, reject)=> {
      this.BS_IsONLINE.subscribe((status)=> {
        if(status)
          resolve(true)
      })
    })
  }


  getCurrentUser(): UserModel {
    return this.currentUser;
  }
  setCurrentUser(user: UserModel) {
    this.currentUser = user;
  }
  getTiledeskToken(): string {
    return this.tiledeskToken;
  }

  setTiledeskToken(token: string) {
    this.tiledeskToken = token
  }

}
