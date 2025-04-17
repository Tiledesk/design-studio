import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Intent } from 'src/app/models/intent-model';
import { ActionOpenHours } from 'src/app/models/action-model';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IntentService } from '../../../../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { Subscription } from 'rxjs/internal/Subscription';
import { TYPE_UPDATE_ACTION } from '../../../../../utils';
import { DashboardService } from 'src/app/services/dashboard.service';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';

@Component({
  selector: 'cds-action-open-hours',
  templateUrl: './cds-action-open-hours.component.html',
  styleUrls: ['./cds-action-open-hours.component.scss']
})
export class CdsActionOpenHoursComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionOpenHours;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()
  
  trueIntentAttributes: any = "";
  falseIntentAttributes: any = "";

  /** CONNECTOR */
  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  idConnectionTrue: string;
  idConnectionFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;
  connector: any;
  private subscriptionChangedConnector: Subscription;
  
  radioOptions: Array<{name: string, category: string, value: string, disabled: boolean, checked: boolean}>= [ 
    {name: 'CDSCanvas.General',               category: 'general',    value: null,            disabled: false, checked: true  }, 
    {name: 'CDSCanvas.SelectedTimeSlot',         category: 'timeSlot',   value: '',      disabled: false, checked: false },
  ]
  radioOptionSelected = null;

  listOfIntents: Array<{name: string, value: string, icon?:string}>;
  timeSlots: Array<{name: string, value: string, hours: string, active: boolean}>

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private formBuilder: FormBuilder,
    private intentService: IntentService,
    private dashboardService: DashboardService,
  ) { }

  ngOnInit(): void {
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      let connectorId = this.idIntentSelected+"/"+this.action._tdActionId;
      if(connector.fromId.startsWith(connectorId)){
        this.connector = connector;
        this.updateConnector();
      }
    });
    this.initialize()
  }

  /** */
  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  // ngOnChanges() {
  //   this.initialize()
  //   if(this.intentSelected){
  //     this.initializeConnector();
  //   }
  //   if (this.action && this.action.trueIntent) {
  //     this.setFormValue()
  //   }
  // }

  private initialize() {
    if (this.dashboardService.project.timeSlots) {
      this.timeSlots = Object.keys(this.dashboardService.project.timeSlots).map(key => ({
        value: key,
        ...this.dashboardService.project.timeSlots[key]
      }));
    }

    this.trueIntentAttributes = this.action.trueIntentAttributes;
    this.falseIntentAttributes = this.action.falseIntentAttributes;
    if(this.intentSelected){
      this.initializeConnector();
      this.checkConnectionStatus();
    }

    this.radioOptionSelected = null;
    if(this.action && this.action.slotId && this.action.slotId !== null){
      this.radioOptionSelected = ''
      this.radioOptions.forEach(el => { el.category === 'timeSlot'? el.checked = true: el.checked = false })
    }
    this.logger.log('[ACTION-OPEN-HOURS] initialize action -->', this.action)
  }


  private initializeConnector() {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected+'/'+this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected+'/'+this.action._tdActionId + '/false';
    this.listOfIntents = this.intentService.getListOfIntents()
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
      this.logger.log('[ACTION-OPEN-HOURS] updateConnector:');
      const resp = updateConnector(this.connector, this.action, this.isConnectedTrue, this.isConnectedFalse, this.idConnectionTrue, this.idConnectionFalse);
      if(resp){
        this.isConnectedTrue    = resp.isConnectedTrue;
        this.isConnectedFalse   = resp.isConnectedFalse;
        this.idConnectionTrue   = resp.idConnectionTrue;
        this.idConnectionFalse  = resp.idConnectionFalse;
        this.logger.log('[ACTION-OPEN-HOURS] updateConnector:', resp);
        if (resp.emit) {
          this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
        } 
      }
    }

  onChangeButtonSelect(event: {label: string, category: string, value: string, disabled: boolean, checked: boolean}){
    this.radioOptions.forEach(el => { el.value ===event.value? el.checked= true: el.checked = false })
    this.action.slotId = null;
    switch (event.category){
      case 'general': 
        this.action.slotId = null
        this.radioOptionSelected = null
        break;
      default:
        this.radioOptionSelected = ''
        break;
    }
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }


  onChangeSelect(event:{name: string, value: string}, type : 'trueIntent' | 'falseIntent' | 'slotId'){
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

  onResetBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent' | 'slotId') {
    switch(type){
      case 'trueIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorTrue, toId: this.action.trueIntent})
        break;
      case 'falseIntent':
        this.onConnectorChange.emit({ type: 'delete', fromId: this.idConnectorFalse, toId: this.action.falseIntent})
        break;
    }
    this.action[type]=null
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeAttributes(attributes:any, type: 'trueIntent' | 'falseIntent'){
    if(type === 'trueIntent'){
      this.action.trueIntentAttributes = attributes;
    }
    if(type === 'falseIntent'){
      this.action.falseIntentAttributes = attributes;
    }
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  /** */
  onStopConditionMeet() {
    try {
      this.action.stopOnConditionMet = !this.action.stopOnConditionMet;
    } catch (error) {
      this.logger.log("Error: ", error);
    }
  }

}
