import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';


// models
import { UserModel } from '../../models/user';

// @Injectable({
//   providedIn: 'root'
// })
@Injectable()
export abstract class MessagingAuthService {

  // BehaviorSubject
  abstract BSAuthStateChanged: BehaviorSubject<any>;
  abstract BSSignOut: BehaviorSubject<any>;

  // params
  public DEFAULT_PERSISTENCE: string = 'NONE';
  public DEFAULT_URL: string = 'https://api.tiledesk.com/v2/auth/';

  private persistence: string = '';
  private baseUrl: string = '';

  public setPersistence(persistence: string): void {
    this.persistence = persistence;
  }

  public getPersistence(): string {
    if (this.persistence) {
      return this.persistence;
    } else {
      return this.DEFAULT_PERSISTENCE;
    }
  }

  public setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }
  public getBaseUrl(): string {
    if (this.baseUrl) {
      return this.baseUrl;
    } else {
      return this.DEFAULT_URL;
    }
  }

  // functions
  abstract initialize(): void;
  abstract getToken(): string;
  abstract createCustomToken(tiledeskToken: string): void;
  abstract logout(): void;

}
