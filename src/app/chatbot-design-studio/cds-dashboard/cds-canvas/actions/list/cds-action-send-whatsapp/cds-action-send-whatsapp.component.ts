import { Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import { ActionSendWhatsapp } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { DashboardService } from 'src/app/services/dashboard.service';
import { WhatsappService } from 'src/app/services/whatsapp.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-send-whatsapp',
  templateUrl: './cds-action-send-whatsapp.component.html',
  styleUrls: ['./cds-action-send-whatsapp.component.scss']
})
export class CdsActionSendWhatsappComponent implements OnInit {

  @Input() action: ActionSendWhatsapp;
  @Input() intentSelected: Intent;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()
  
  listOfIntents: Array<{name: string, value: string, icon?:string}>;

  // Connectors
  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;
  connector: any;
  private subscriptionChangedConnector: Subscription;
  
  project_id: string;

  templates_list = [];
  // receiver_list = [];

  phone_number_id: string;
  showLoader: Boolean = false;
  selected_template: any;
  payload: any;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private dashboardService: DashboardService,
    private intentService: IntentService,
    private whatsapp: WhatsappService,
    public el: ElementRef
  ) { }

  ngOnInit(): void {
    this.logger.debug("[ACTION-SEND WHATSAPP] action detail: ", this.action);
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      this.logger.debug('[ACTION-SEND WHATSAPP] isChangedConnector -->', connector);
      this.connector = connector;
      this.updateConnector();
    });
   
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.logger.log("[ACTION REPLACE BOT] action (on-changes): ", this.action)
    this.initialize();
  }

  /** */
  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  private checkConnectionStatus(){
    if(this.action.trueIntent){
     this.isConnectedTrue = true;
    } else {
     this.isConnectedTrue = false;
    }
    if(this.action.falseIntent){
      this.isConnectedFalse = true;
     } else {
      this.isConnectedFalse = false;
     }
  }

  initializeConnector() {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected+'/'+this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected+'/'+this.action._tdActionId + '/false';
    this.listOfIntents = this.intentService.getListOfIntents();
    this.checkConnectionStatus();
  }

  private updateConnector(){
    try {
      const array = this.connector.fromId.split("/");
      const idAction= array[1];
      if(idAction === this.action._tdActionId){
        if(this.connector.deleted){
          if(array[array.length -1] === 'true'){
            this.action.trueIntent = null
            this.isConnectedTrue = false
          }        
          if(array[array.length -1] === 'false'){
            this.action.falseIntent = null
            this.isConnectedFalse = false;
          }
          if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
        } else { 
          this.logger.debug('[ACTION-SEND WHATSAPP] updateConnector', this.connector.toId, this.connector.fromId ,this.action, array[array.length-1]);
          if(array[array.length -1] === 'true'){
            this.isConnectedTrue = true;
            this.action.trueIntent = '#'+this.connector.toId;
            if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
          }        
          if(array[array.length -1] === 'false'){
            this.isConnectedFalse = true;
            if(this.action.falseIntent !== '#'+this.connector.toId){
              this.action.falseIntent = '#'+this.connector.toId;
              if(this.connector.save)this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector});
            } 
          }
        }

      }
    } catch (error) {
      this.logger.error('[ACTION-SEND WHATSAPP] updateConnector error: ', error);
    }
  }

  private initialize(){
    this.project_id = this.dashboardService.projectID
    this.action.payload.id_project = this.project_id
    if (this.previewMode == false) {
      this.logger.log("Whatsapp static project_id: ", this.project_id);
      this.showLoader = true;
      this.getTemplates();
    }
    if(this.intentSelected){
      this.initializeConnector();
    }
  }

  getTemplates() {
    this.whatsapp.getAllTemplates().subscribe({ next:(templates: any[]) => {

      this.templates_list = templates.map(t => {
        if (t.category === 'MARKETING') {
          t.icon = "campaign"
        }
        else {
          t.icon = "notifications_active"
        }
        t.description = t.components.find(c => c.type === 'BODY').text;
        return t;
      })

    }, error: (error) => {
      this.showLoader = false;
      this.logger.log("[ACTION-SEND WHATSAPP] error get templates: ", error);
    }, complete: () => {
      this.logger.log("[ACTION-SEND WHATSAPP] get templates completed: ");
      if (this.action.templateName) {
        this.selected_template = this.templates_list.find(t => t.name === this.action.templateName);
      }
      this.showLoader = false;
    }})
  }

  onChangeSelect(event) {
    this.logger.debug("[ACTION-SEND WHATSAPP] onChangeSelect event", event);
    this.selected_template = event;
    this.action.templateName = this.selected_template.name;
    this.action.payload.template.name = this.selected_template.name;
    this.action.payload.template.language = this.selected_template.language;
    this.action.payload.receiver_list = [];
    this.addReceiver();
    this.updateAndSaveAction.emit();
  }

  addReceiver() {
    this.action.payload.receiver_list.push({ phone_number: null });
  }

  onChangeTextarea(event){
    if(event){
      this.phone_number_id = event
      let element = document.getElementById('phone-number-id');
      element.classList.remove('is-invalid');
      var reg = new RegExp('^[0-9]+$');
      if (!reg.test(this.phone_number_id)) {
        element.classList.add('is-invalid');
      } else {
        this.action.payload.phone_number_id = this.phone_number_id;
        this.updateAndSaveAction.emit();
      }

      this.logger.debug("[ACTION-SEND WHATSAPP] Action updated ", this.action.payload);
    }
  }

  onChangeBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent') {
    if(event){
      this.action[type]=event.value

      switch(type){
        case 'trueIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorTrue, toId: this.action.trueIntent})
          break;
        case 'falseIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorFalse, toId: this.action.falseIntent})
          break;
      }
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
  }

  onResetBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent') {
    switch(type){
      case 'trueIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorTrue, toId: this.action.trueIntent})
        break;
      case 'falseIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorFalse, toId: this.action.falseIntent})
        break;
    }
    this.action[type] = null;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onReceiverEmitted(event, index) {
    // update receiver
    this.action.payload.receiver_list[index] = event;
    this.logger.log("[ACTION-SEND WHATSAPP] Action updated ", this.action.payload);
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

}
