import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { ActionAskGPTV2 } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { variableList, TYPE_UPDATE_ACTION, TYPE_GPT_MODEL } from '../../../../../utils';
import { AppConfigService } from 'src/app/services/app-config';

@Component({
  selector: 'cds-action-askgpt-v2',
  templateUrl: './cds-action-askgpt-v2.component.html',
  styleUrls: ['./cds-action-askgpt-v2.component.scss']
})
export class CdsActionAskgptV2Component implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionAskGPTV2;
  @Input() previewMode: boolean = true;
  @Input() project_id: string;
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

  model_list: Array<{ name: string, value: string }>;

  private subscriptionChangedConnector: Subscription;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private intentService: IntentService,
    private appConfigService: AppConfigService,
  ) { }

  ngOnInit(): void {
    this.logger.debug("[ACTION-ASKGPTV2] action detail: ", this.action);
    this.model_list = Object.values(TYPE_GPT_MODEL).filter(el=> el.status !== 'inactive')
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION-ASKGPTV2] isChangedConnector -->', connector);
      this.connector = connector;
      this.updateConnector();
    });
    if(this.intentSelected){
      this.initializeConnector();
    }
    if (this.previewMode == false) {
      this.onDetailModeLoad();
    }
  }

  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  onDetailModeLoad() {
    //this.getKnowledgeBaseSettings();
    this.initializeAttributes();
  }

  initializeConnector() {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected+'/'+this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected+'/'+this.action._tdActionId + '/false';
    this.listOfIntents = this.intentService.getListOfIntents();
    this.checkConnectionStatus();
  }

  private checkConnectionStatus(){
    if(this.action.trueIntent){
      this.isConnectedTrue = true;
      const posId = this.action.trueIntent.indexOf("#");
      if (posId !== -1) {
        const toId = this.action.trueIntent.slice(posId+1);
        this.idConnectionTrue = this.idConnectorTrue+"/"+toId;
      }
    } else {
      this.isConnectedTrue = false;
      this.idConnectionTrue = null;
    }
    if(this.action.falseIntent){
      this.isConnectedFalse = true;
      const posId = this.action.falseIntent.indexOf("#");
      if (posId !== -1) {
        const toId = this.action.falseIntent.slice(posId+1);
        this.idConnectionFalse = this.idConnectorFalse+"/"+toId;
      }
     } else {
      this.isConnectedFalse = false;
      this.idConnectionFalse = null;
     }
  }

  private updateConnector(){
    try {
      const array = this.connector.fromId.split("/");
      const idAction= array[1];
      if(idAction === this.action._tdActionId){
        if(this.connector.deleted){
          if(array[array.length -1] === 'true'){
            this.action.trueIntent = null;
            this.isConnectedTrue = false;
            this.idConnectionTrue = null;
          }        
          if(array[array.length -1] === 'false'){
            this.action.falseIntent = null;
            this.isConnectedFalse = false;
            this.idConnectionFalse = null;
          }
          if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
        } else { 
          // TODO: verificare quale dei due connettori è stato aggiunto (controllare il valore della action corrispondente al true/false intent)
          this.logger.debug('[ACTION-ASKGPTV2] updateConnector', this.connector.toId, this.connector.fromId ,this.action, array[array.length-1]);
          if(array[array.length -1] === 'true'){
            // this.action.trueIntent = '#'+this.connector.toId;
            this.isConnectedTrue = true;
            this.idConnectionTrue = this.connector.fromId+"/"+this.connector.toId;
            this.action.trueIntent = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }        
          if(array[array.length -1] === 'false'){
            // this.action.falseIntent = '#'+this.connector.toId;
            this.isConnectedFalse = true;
            this.idConnectionFalse = this.connector.fromId+"/"+this.connector.toId;
            this.action.falseIntent = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }
        }
      }
    } catch (error) {
      this.logger.error('[ACTION-ASKGPTV2] updateConnector error: ', error);
    }
  }


  private initializeAttributes() {
    let new_attributes = [];
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'kb_reply')) {
      new_attributes.push({ name: "kb_reply", value: "kb_reply" });
    }
    if (!variableList.find(el => el.key ==='userDefined').elements.some(v => v.name === 'kb_source')) {
      new_attributes.push({ name: "kb_source", value: "kb_source" });
    }
    variableList.find(el => el.key ==='userDefined').elements = [ ...variableList.find(el => el.key ==='userDefined').elements, ...new_attributes];
    this.logger.debug("[ACTION ASKGPTV2] Initialized variableList.userDefined: ", variableList.find(el => el.key ==='userDefined'));
  }

  changeTextarea($event: string, property: string) {
    this.logger.log("[ACTION-ASKGPT] onEditableDivTextChange event", $event)
    this.logger.log("[ACTION-ASKGPT] onEditableDivTextChange property", property)
    this.action[property] = $event
    // this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }
  
  onBlur(event){
    this.updateAndSaveAction.emit();
  }
  
  onChangeSelect(event, target) {
    if (event.clickEvent === 'footer') {
      // this.openAddKbDialog();  moved in knowledge base settings
    } else {
      this.logger.log("event: ", event);
      this.action.model = event.value;
      
      this.logger.log("[ACTION-ASKGPT] updated action", this.action);
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
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
  
  onChangeAttributes(attributes:any, type:'trueIntent' | 'falseIntent'){
    this.logger.log("type: ", type)
    this.logger.log("attributes: ", attributes)
    if (type === 'trueIntent') {
      this.action.trueIntentAttributes = attributes;
    }
    if (type === 'falseIntent') {
      this.action.falseIntentAttributes = attributes;
    }
    this.logger.log("action updated: ", this.action)
  }

  goToKNB(){
    let url = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/' + this.project_id +'/knowledge-bases'
    window.open(url, '_blank')
  }

}
