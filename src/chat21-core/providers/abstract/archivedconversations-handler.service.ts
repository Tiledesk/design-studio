import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ConversationModel } from '../../models/conversation';
import { ImageRepoService } from './image-repo.service';

@Injectable()
export abstract class ArchivedConversationsHandlerService {

  // BehaviorSubject
  abstract BSConversationDetail: BehaviorSubject<ConversationModel>;
  abstract archivedConversationAdded: BehaviorSubject<ConversationModel>;
  abstract archivedConversationChanged: BehaviorSubject<ConversationModel>;
  abstract archivedConversationRemoved: BehaviorSubject<ConversationModel>;
  // abstract readAllMessages: BehaviorSubject<string> = new BehaviorSubject<string>(null);

  // params
  abstract archivedConversations: Array<ConversationModel>;
  abstract uidConvSelected: string;
  //abstract imageRepo: ImageRepoService;

  // functions
  abstract initialize(tenant: string, userId: string, translationMap: Map<string, string>): void;
  // abstract connect(): void;
  abstract subscribeToConversations(callback: any): void;
  abstract countIsNew(): number;
  abstract setConversationRead(conversationId: string): void;
  abstract dispose(): void;
  abstract getConversationDetail(conversationId: string, callback:(conv: ConversationModel)=>void): void;
  abstract getClosingConversation(conversationId: string): boolean;
  abstract setClosingConversation(conversationId: string, status: boolean): void;
  abstract deleteClosingConversation(conversationId: string): void;

}
