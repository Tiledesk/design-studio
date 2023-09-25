import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { GroupModel } from 'src/chat21-core/models/group';
import { UserModel } from 'src/chat21-core/models/user';

@Injectable({
  providedIn: 'root'
})
export abstract class GroupsHandlerService {

  // BehaviorSubject
  abstract BSgroupDetail: BehaviorSubject<GroupModel>;
  abstract SgroupDetail: Subject<GroupModel>;
  abstract groupAdded: BehaviorSubject<GroupModel>;
  abstract groupChanged: BehaviorSubject<GroupModel>;
  abstract groupRemoved: BehaviorSubject<GroupModel>;

  abstract initialize(tenant: string, loggedUserId: string): void;
  abstract connect(): void;
  abstract getDetail(groupId: string, callback?:(group: GroupModel)=>void): Promise<GroupModel>;
  abstract onGroupChange(groupId: string): Observable<GroupModel>;
  abstract create(groupName: string, members: [string], callback?:(res: any, error: any)=>void): Promise<any>;
  abstract leave(groupId: string, callback?:(res: any, error: any)=>void): Promise<any>;
  abstract join(groupId: string, member: string, callback?:(res: any, error: any)=>void)
  abstract dispose(): void;
}
