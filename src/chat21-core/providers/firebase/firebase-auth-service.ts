import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

// firebase
// import firebase from 'firebase/app';

// services
import { MessagingAuthService } from '../abstract/messagingAuth.service';

// utils
import { LoggerService } from '../abstract/logger.service';
import { LoggerInstance } from '../logger/loggerInstance';


// @Injectable({ providedIn: 'root' })
@Injectable()
export class FirebaseAuthService extends MessagingAuthService {


  // BehaviorSubject
  BSAuthStateChanged: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  BSSignOut: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  // public params
  // private persistence: string;
  public SERVER_BASE_URL: string;

  private URL_TILEDESK_CREATE_CUSTOM_TOKEN: string;
  //TODO-GAB
  // private imageRepo: ImageRepoService = new FirebaseImageRepoService();

  private firebaseToken: string;
  private firebase: any;
  private logger:LoggerService = LoggerInstance.getInstance()
  constructor(
    public http: HttpClient
  ) {
    super();
  }

  /**
   *
   */
  async initialize() {
    this.SERVER_BASE_URL = this.getBaseUrl();
    this.URL_TILEDESK_CREATE_CUSTOM_TOKEN = this.SERVER_BASE_URL + 'chat21/firebase/auth/createCustomToken';
    this.logger.debug('[FIREBASEAuthSERVICE] - initialize URL_TILEDESK_CREATE_CUSTOM_TOKEN ', this.URL_TILEDESK_CREATE_CUSTOM_TOKEN)
    // this.checkIsAuth();

    const { default: firebase} = await import("firebase/app");
    await Promise.all([import("firebase/auth")]);
    this.firebase = firebase

    this.onAuthStateChanged();
  }

  /**
   * checkIsAuth
   */
  // checkIsAuth() {
  //   this.logger.debug(' ---------------- AuthService checkIsAuth ---------------- ')
  //   this.tiledeskToken = this.appStorage.getItem('tiledeskToken')
  //   this.currentUser = JSON.parse(this.appStorage.getItem('currentUser'));
  //   if (this.tiledeskToken) {
  //     this.logger.debug(' ---------------- MI LOGGO CON UN TOKEN ESISTENTE NEL LOCAL STORAGE O PASSATO NEI PARAMS URL ---------------- ')
  //     this.createFirebaseCustomToken();
  //   }  else {
  //     this.logger.debug(' ---------------- NON sono loggato ---------------- ')
  //     // this.BSAuthStateChanged.next('offline');
  //   }

  //   // da rifattorizzare il codice seguente!!!
  //   // const that = this;
  //   // this.route.queryParams.subscribe(params => {
  //   //   if (params.tiledeskToken) {
  //   //     that.tiledeskToken = params.tiledeskToken;
  //   //   }
  //   // });
  // }


  /** */
  getToken(): string {
    return this.firebaseToken;
  }


  // ********************* START FIREBASE AUTH ********************* //
  /**
   * FIREBASE: onAuthStateChanged
   */
  onAuthStateChanged() {
    const that = this;

    this.firebase.auth().onAuthStateChanged(user => {
      this.logger.debug('[FIREBASEAuthSERVICE] onAuthStateChanged', user)
      if (!user) {
        this.logger.debug('[FIREBASEAuthSERVICE] 1 - PUBLISH OFFLINE to chat-manager')
        that.BSAuthStateChanged.next('offline');
      } else {
        this.logger.debug('[FIREBASEAuthSERVICE] 2 - PUBLISH ONLINE to chat-manager')
        that.BSAuthStateChanged.next('online');
      }
    });
  }

  /**
   * FIREBASE: signInWithCustomToken
   * @param token
   */
  signInFirebaseWithCustomToken(token: string): Promise<any> {
    const that = this;
    let firebasePersistence;
    switch (this.getPersistence()) {
      case 'SESSION': {
        firebasePersistence = this.firebase.auth.Auth.Persistence.SESSION;
        break;
      }
      case 'LOCAL': {
        firebasePersistence = this.firebase.auth.Auth.Persistence.LOCAL;
        break;
      }
      case 'NONE': {
        firebasePersistence = this.firebase.auth.Auth.Persistence.NONE;
        break;
      }
      default: {
        firebasePersistence = this.firebase.auth.Auth.Persistence.NONE;
        break;
      }
    }
    return that.firebase.auth().setPersistence(firebasePersistence).then(async () => {
      return that.firebase.auth().signInWithCustomToken(token).then(async () => {
        // that.firebaseSignInWithCustomToken.next(response);
      }).catch((error) => {
        that.logger.error('[FIREBASEAuthSERVICE] signInFirebaseWithCustomToken Error: ', error);
        // that.firebaseSignInWithCustomToken.next(null);
      });
    }).catch((error) => {
      that.logger.error('[FIREBASEAuthSERVICE] signInFirebaseWithCustomToken Error: ', error);
    });
  }

  /**
   * FIREBASE: createUserWithEmailAndPassword
   * @param email
   * @param password
   * @param firstname
   * @param lastname
   */
  createUserWithEmailAndPassword(email: string, password: string): any {
    const that = this;
    return this.firebase.auth().createUserWithEmailAndPassword(email, password).then((response) => {
      that.logger.debug('[FIREBASEAuthSERVICE] CRATE USER WITH EMAIL: ', email, ' & PSW: ', password);
      // that.firebaseCreateUserWithEmailAndPassword.next(response);
      return response;
    }).catch((error) => {
      that.logger.error('[FIREBASEAuthSERVICE] createUserWithEmailAndPassword error: ', error.message);
      return error;
    });
  }


  /**
   * FIREBASE: sendPasswordResetEmail
   */
  sendPasswordResetEmail(email: string): any {
    const that = this;
    return this.firebase.auth().sendPasswordResetEmail(email).then(() => {
      that.logger.debug('[FIREBASEAuthSERVICE] firebase-send-password-reset-email');
      // that.firebaseSendPasswordResetEmail.next(email);
    }).catch((error) => {
      that.logger.error('[FIREBASEAuthSERVICE] sendPasswordResetEmail error: ', error);
    });
  }

  /**
   * FIREBASE: signOut
   */
  private signOut(): Promise<boolean> {
    const that = this;
    return new Promise((resolve, reject)=> {that.firebase.auth().signOut().then(() => {
      that.logger.debug('[FIREBASEAuthSERVICE] firebase-sign-out');
        // cancello token
        // this.appStorage.removeItem('tiledeskToken');
        //localStorage.removeItem('firebaseToken');
        that.BSSignOut.next(true);
        resolve(true)
      }).catch((error) => {
        resolve(false)
        that.logger.error('[FIREBASEAuthSERVICE] signOut error: ', error);
      });
    });
  }


  /**
   * FIREBASE: currentUser delete
   */
  delete() {
    const that = this;
    this.firebase.auth().currentUser.delete().then(() => {
      that.logger.debug('[FIREBASEAuthSERVICE] firebase-current-user-delete');
      // that.firebaseCurrentUserDelete.next();
    }).catch((error) => {
      that.logger.error('[FIREBASEAuthSERVICE] delete error: ', error);
    });
  }

  // ********************* END FIREBASE AUTH ********************* //


  /**
   *
   * @param token
   */
  createCustomToken(tiledeskToken: string) {
    const headers = new HttpHeaders({
      'Content-type': 'application/json',
      Authorization: tiledeskToken
    });
    const responseType = 'text';
    const postData = {};
    const that = this;
    this.http.post(this.URL_TILEDESK_CREATE_CUSTOM_TOKEN, postData, { headers, responseType }).subscribe(data => {
      that.firebaseToken = data;
      //localStorage.setItem('firebaseToken', that.firebaseToken);
      that.signInFirebaseWithCustomToken(data)
    }, error => {
      that.logger.error('[FIREBASEAuthSERVICE] createFirebaseCustomToken ERR ', error) 
    });
  }

  logout(): Promise<boolean> {
    this.logger.debug('[FIREBASEAuthSERVICE] logout');
    // cancello token firebase dal local storage e da firebase
    // dovrebbe scattare l'evento authchangeStat
    return this.signOut();
  }

}
