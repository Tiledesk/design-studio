import { Injectable } from '@angular/core';
import { UserModel } from 'src/chat21-core/models/user';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export abstract class NotificationsService {
  
  private _tenant: string = '';
  public BUILD_VERSION = environment.VERSION

  public setTenant(tenant: string): void {
    this._tenant = tenant;
  }
  public getTenant(): string {
    let tenant = ''
    if (this._tenant) {
      tenant = this._tenant;
    }
    return tenant
  }

  abstract initialize(tenant: string, vapidKey: string, platform: string): void;
  abstract getNotificationPermissionAndSaveToken(currentUserUid: string): void;
  abstract removeNotificationsInstance(callback: (arg: string) => void): void;

  constructor( ) { 
      
  }


}
