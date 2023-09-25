import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export abstract class ConversationHandlerBuilderService {

  constructor() { }

  abstract build(): any;
}
