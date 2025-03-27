import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';

//SERVICES
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { DashboardService } from 'src/app/services/dashboard.service';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { AppConfigService } from 'src/app/services/app-config';

//MODELS
import { ActionQapla } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { Project } from 'src/app/models/project-model';

//UTILS
import { TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';

@Component({
  selector: 'cds-action-qapla',
  templateUrl: './cds-action-qapla.component.html',
  styleUrls: ['./cds-action-qapla.component.scss']
})
export class CdsActionQaplaComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionQapla;
  @Input() project_id: string;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter;
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()

  listOfIntents: Array<{name: string, value: string, icon?:string}>;

  // Connectors
  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  idConnectionTrue: string;
  idConnectionFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;
  connector: any;
  private subscriptionChangedConnector: Subscription;
  
  project: Project;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private dashboardService: DashboardService,
    private intentService: IntentService,
    private appConfigService: AppConfigService,
  ) { }

  ngOnInit(): void {
    this.logger.log("[ACTION QAPLA] action:", this.action);
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION-ASKGPT] isChangedConnector -->', connector);
      let connectorId = this.idIntentSelected+"/"+this.action._tdActionId;
      if(connector.fromId.startsWith(connectorId)){
        this.connector = connector;
        this.updateConnector();
      }
    });
    if(this.intentSelected){
      this.initializeConnector();
    }

    this.initializeAttributes();
    this.project = this.dashboardService.project;
  }

  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  initializeConnector() {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected+'/'+this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected+'/'+this.action._tdActionId + '/false';
    this.listOfIntents = this.intentService.getListOfIntents();
    this.checkConnectionStatus();
  }


  private checkConnectionStatus(){
    const resp = checkConnectionStatusOfAction(this.action, this.idConnectorTrue, this.idConnectorFalse);
    this.isConnectedTrue    = resp.isConnectedTrue;
    this.isConnectedFalse   = resp.isConnectedFalse;
    this.idConnectionTrue   = resp.idConnectionTrue;
    this.idConnectionFalse  = resp.idConnectionFalse;
  }


  /** */
  private updateConnector(){
    this.logger.log('[ACTION-ASKGPT] updateConnector:');
    const resp = updateConnector(this.connector, this.action, this.isConnectedTrue, this.isConnectedFalse, this.idConnectionTrue, this.idConnectionFalse);
    if(resp){
      this.isConnectedTrue    = resp.isConnectedTrue;
      this.isConnectedFalse   = resp.isConnectedFalse;
      this.idConnectionTrue   = resp.idConnectionTrue;
      this.idConnectionFalse  = resp.idConnectionFalse;
      this.logger.log('[ACTION-ASKGPT] updateConnector:', resp);
      if (resp.emit) {
        this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
      } 
    }
  }
  
  
  private initializeAttributes() {
    let new_attributes = [];
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'qapla_status')) {
      new_attributes.push({ name: "qapla_status", value: "qapla_status" });
    }
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'qapla_result')) {
      new_attributes.push({ name: "qapla_result", value: "qapla_result" });
    }
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'qapla_error')) {
      new_attributes.push({ name: "qapla_error", value: "qapla_error" });
    }
    variableList.find(el => el.key ==='userDefined').elements = [...variableList.find(el => el.key ==='userDefined').elements, ...new_attributes];
    this.logger.debug("[ACTION GPT-TASK] Initialized variableList.userDefined: ", variableList.find(el => el.key ==='userDefined'));
  }

  changeTextarea($event: string, property: string) {
    this.logger.debug("[ACTION QAPLA] changeTextarea event: ", $event);
    this.logger.debug("[ACTION QAPLA] changeTextarea propery: ", property);
    this.action[property] = $event;
    this.logger.log("[ACTION QAPLA] Action updated: ", this.action);
    // this.updateAndSaveAction.emit();  
  }

  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION QAPLA] onEditableDivTextChange event", event)
    this.logger.log("[ACTION QAPLA] onEditableDivTextChange property", property)
    this.action[property] = event.value;
    this.logger.log("[ACTION QAPLA] Action updated: ", this.action);
    this.updateAndSaveAction.emit();
  }

  onChangeBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent') {
    if(event){
      this.action[type]=event.value
      switch(type){
        case 'trueIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorTrue, toId: this.action.trueIntent});
          break;
        case 'falseIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorFalse, toId: this.action.falseIntent});
          break;
      }
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
  }

  onResetBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent') {
    switch(type){
      case 'trueIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorTrue, toId: this.action.trueIntent});
        break;
      case 'falseIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorFalse, toId: this.action.falseIntent});
        break;
    }
    this.action[type]=null
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }
  
  onBlur(event){
    this.updateAndSaveAction.emit();
  }

  goToIntegration(){
    let url = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/' + this.project_id +'/integrations?name=' + this.action._tdActionType
    window.open(url, '_blank')
  }
}
