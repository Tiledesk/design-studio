import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})

export abstract class TypingService {

  // BehaviorSubject
  abstract BSIsTyping: BehaviorSubject<any>;
  abstract BSSetTyping: BehaviorSubject<any>;

  // params
  // private _tenant: string;
  // public setTenant(tenant): void {
  //   this._tenant = tenant;
  // }
  // public getTenant(): string {
  //   if (this._tenant) {
  //     return this._tenant;
  //   } 
  // }


  // functions
  abstract initialize(tenant: string): void;
  abstract isTyping(idConversation: string, idCurrentUser: string, isDirect: boolean): void;
  abstract setTyping(idConversation: string, message: string, idUser: string, userFullname: string): void;
}
