import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { GroupModel } from 'src/chat21-core/models/group';
import { GroupsHandlerService } from 'src/chat21-core/providers/abstract/groups-handler.service';
import { CustomLogger } from '../logger/customLogger';
import { Chat21Service } from './chat-service';
import { LoggerInstance } from '../logger/loggerInstance';
import { avatarPlaceholder, getColorBck } from 'src/chat21-core/utils/utils-user';

@Injectable({
    providedIn: 'root'
  })
  export class MQTTGroupsHandler extends GroupsHandlerService {
    
    // BehaviorSubject
    BSgroupDetail: BehaviorSubject<GroupModel> = new BehaviorSubject<GroupModel>(null); 
    SgroupDetail: Subject<GroupModel> = new BehaviorSubject<GroupModel>(null);
    groupAdded: BehaviorSubject<GroupModel> = new BehaviorSubject<GroupModel>(null);
    groupChanged: BehaviorSubject<GroupModel> = new BehaviorSubject<GroupModel>(null);
    groupRemoved: BehaviorSubject<GroupModel> = new BehaviorSubject<GroupModel>(null);

    // private params
    private tenant: string;
    private loggedUserId: string;
    private logger: LoggerService = LoggerInstance.getInstance()
    
    constructor(
        public chat21Service: Chat21Service
    ) {
        super();
    }

    /**
     * inizializzo groups handler
     */
    initialize(tenant: string, loggedUserId: string): void {
        this.logger.log('[MQTT-GROUPS-HANDLER] initialize');
        this.tenant = tenant;
        this.loggedUserId = loggedUserId;
    }

    /**
     * mi connetto al nodo groups
     * creo la reference
     * mi sottoscrivo a change, removed, added
     */
    connect(): void {
        // TODO deprecated method.
    }

    /**
     * mi connetto al nodo groups/GROUPID
     * creo la reference
     * mi sottoscrivo a value
     */
    getDetail(groupId: string, callback?: (group: GroupModel) => void): Promise<GroupModel> {
        //throw new Error('Method not implemented.');
        // Ignorare versione firebase
          this.logger.log('Method not implemented.');
          return;
    }
// abstract onGroupChange(groupId: string): Observable<GroupModel>;
    onGroupChange(groupId: string): Observable<GroupModel> {
        if (this.isGroup(groupId)) {
            this.chat21Service.chatClient.groupData(groupId, (err, group) => {
                this.logger.log('[MQTT-GROUPS-HANDLER] onGroupChange: got result by REST call:', group);
                this.groupValue(group.result);
                this.logger.log('[MQTT-GROUPS-HANDLER] onGroupChange: subscribing to group updates...', groupId);
                const handler_group_updated = this.chat21Service.chatClient.onGroupUpdated( (group, topic) => {
                    if (topic.conversWith === groupId) {
                        this.groupValue(group);
                    }
                });
            });
        }
        return this.SgroupDetail
    }

    isGroup(groupId) {
        if (groupId.indexOf('group-') >= 0) {
            return true;
        }
        return false;
    }

    private groupValue(childSnapshot: any){
        this.logger.debug('[MQTT-GROUPS-SERV] group detail::', childSnapshot)
        const group: GroupModel = childSnapshot;
        this.logger.debug('[MQTT-GROUPS-SERV] groupValue ', group)
        if (group) {
            let groupCompleted = this.completeGroup(group)
            this.SgroupDetail.next(groupCompleted)
        }
    }

    private completeGroup(group: any): GroupModel {
        group.avatar = avatarPlaceholder(group.name);
        group.color = getColorBck(group.name);
        // group.membersinfo = group.members;
        return group
    }

    create(groupName: string, members: [string], callback?: (res: any, error: any) => void): Promise<any> {
        // throw new Error('Method not implemented.');
        // Ignorare versione firebase
        this.logger.log('Method not implemented.');
        return;
    }

    // create(groupName: string, members: [string], callback?:(res: any, error: any)=>void): Promise<any> {

    // }

    leave(groupId: string, callback?: (res: any, error: any) => void): Promise<any> {
        // throw new Error('Method not implemented.');
        // Ignorare versione firebase
        this.logger.log('Method not implemented.');
        return;
    }

    join(groupId: string, member: string, callback?: (res: any, error: any) => void) {
        // throw new Error('Method not implemented.');
        // Ignorare versione firebase
        this.logger.log('Method not implemented.');
        return;
    }


    dispose(): void {
        //throw new Error('Method not implemented.');
        this.logger.log('Method not implemented.');
    }
      
  }
