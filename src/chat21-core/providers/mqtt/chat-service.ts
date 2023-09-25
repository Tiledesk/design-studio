import { Injectable } from '@angular/core';

import { Chat21Client } from 'src/assets/js/chat21client';
// declare var Chat21Client: any;

/*
  Generated class for the AuthService provider.
  See https://angular.io/docs/ts/latest/guide/dependency-injection.html
  for more info on providers and Angular 2 DI.
*/
@Injectable()
/**
 * DESC PROVIDER
 */
export class Chat21Service {

  public chatClient: any;
  private _config: any;

  constructor() {
  }

  public set config(config: any) {
    this._config = config;
  }

  public get config() : any {
    return this._config;
  }

  initChat() {
    if (!this._config || this._config.appId === 'CHANGEIT') {
      throw new Error('chat21Config is not defined. Please setup your environment');
    }
    console.log("INIT new Chat21Client")
    if (!this.chatClient) {
      this.chatClient = new Chat21Client(this._config);
    }
    else {
      console.log("Did you try again to create a Chat21Client istance?");
    }
    // console.log("chatClient init. ID:", this.chatClient.client_id)
  }
}