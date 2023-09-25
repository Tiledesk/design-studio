import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})

export abstract class PresenceService {

  // BehaviorSubject
  abstract BSIsOnline: BehaviorSubject<any>;
  abstract BSLastOnline: BehaviorSubject<any>;

  // params
  // abstract tenant = environment.tenant;

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
  abstract userIsOnline(userid: string): Observable<any>
  abstract lastOnlineForUser(userid: string): void;
  abstract setPresence(userid: string): void;
  abstract imHere():void;
  abstract removePresence(): void;
}
