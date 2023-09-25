import { Injectable } from '@angular/core';
// firebase
// import * as firebase from 'firebase/app';
import firebase from "firebase/app";
import 'firebase/app';
/*
  Generated class for the AuthService provider.
  See https://angular.io/docs/ts/latest/guide/dependency-injection.html
  for more info on providers and Angular 2 DI.
*/
@Injectable()
/**
 * DESC PROVIDER
 */
export class FirebaseInitService {

  public static firebaseInit: any;
  
  constructor() {
  }

  public static initFirebase(firebaseConfig: any) {
    if(!FirebaseInitService.firebaseInit){
        if (!firebaseConfig || firebaseConfig.apiKey === 'CHANGEIT') {
            throw new Error('Firebase config is not defined. Please create your chat-config.json. See the chat21-ionic Installation Page');
          } 
          FirebaseInitService.firebaseInit = firebase.initializeApp(firebaseConfig); 
    }
    return FirebaseInitService.firebaseInit
  }
}