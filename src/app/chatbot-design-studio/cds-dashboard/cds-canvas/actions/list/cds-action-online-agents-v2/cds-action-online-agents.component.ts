import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { IntentService } from '../../../../../services/intent.service';
import { Intent } from 'src/app/models/intent-model';
import { ActionOnlineAgentV2 } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { Subscription } from 'rxjs/internal/Subscription';
import { TYPE_UPDATE_ACTION } from '../../../../../utils';
import { DashboardService } from 'src/app/services/dashboard.service';
import { Department } from 'src/app/models/department-model';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';


@Component({
  selector: 'cds-action-online-agents-v2',
  templateUrl: './cds-action-online-agents.component.html',
  styleUrls: ['./cds-action-online-agents.component.scss']
})
export class CdsActionOnlineAgentsV2Component implements OnInit {

  // @Input() listOfActions: Array<{name: string, value: string, icon?:string}>;
  @Input() intentSelected: Intent;
  @Input() action: ActionOnlineAgentV2;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()
  
  radioOptions: Array<{name: string, value: string, disabled: boolean, checked: boolean}>= [ 
    {name: 'CDSCanvas.ProjectWide',               value: 'all',            disabled: false, checked: true  }, 
    {name: 'CDSCanvas.CurrentDepartment',         value: 'currentDep',    disabled: false, checked: false },
    {name: 'CDSCanvas.SelectedDepartment',        value: 'selectedDep',   disabled: false, checked: false }
  ]

  actionOnlineAgentsFormGroup: FormGroup
  trueIntentAttributes: string = "";
  falseIntentAttributes: string = "";

  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  idConnectionTrue: string;
  idConnectionFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;
  connector: any;
  private subscriptionChangedConnector: Subscription;
  
  listOfIntents: Array<{name: string, value: string, icon?:string}>;
  departments: Department[]

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
    this.initialize();
  }

  /** */
  ngOnDestroy() {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  // ngOnChanges() {
  //   this.initialize();
  //   if(this.intentSelected){
  //     this.initializeConnector();
  //   }
  //   if (this.action && this.action.trueIntent) {
  //     this.setFormValue();
  //   }
  // }


  private initialize() {
    this.actionOnlineAgentsFormGroup = this.buildForm();
    this.actionOnlineAgentsFormGroup.valueChanges.subscribe(form => {
      this.logger.log('[ACTION-ONLINE-AGENT] form valueChanges-->', form)
      if (form && (form.trueIntent !== ''))
        this.action = Object.assign(this.action, this.actionOnlineAgentsFormGroup.value);
    })
    this.trueIntentAttributes = this.action.trueIntentAttributes;
    this.falseIntentAttributes = this.action.falseIntentAttributes;
    if(this.intentSelected){
      this.initializeConnector();
    }
    if (this.action && this.action.trueIntent) {
      this.setFormValue();
    }
    this.departments = this.dashboardService.departments
    
    //FIX: if chatbot is imported from other env/project --> reset selectedDepartmentId 
    if(this.action.selectedDepartmentId){
      let actionDepIndex = this.departments.findIndex(dep => dep._id === this.action.selectedDepartmentId)
      if(actionDepIndex === -1){
        this.action.selectedDepartmentId = null;
      }
    }

  }
  

  private initializeConnector() {
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
    this.logger.log('[ACTION-ONLINE-AGENT] updateConnector:');
    const resp = updateConnector(this.connector, this.action, this.isConnectedTrue, this.isConnectedFalse, this.idConnectionTrue, this.idConnectionFalse);
    if(resp){
      this.isConnectedTrue    = resp.isConnectedTrue;
      this.isConnectedFalse   = resp.isConnectedFalse;
      this.idConnectionTrue   = resp.idConnectionTrue;
      this.idConnectionFalse  = resp.idConnectionFalse;
      this.logger.log('[ACTION-ONLINE-AGENT] updateConnector:', resp);
      if (resp.emit) {
        this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
      } 
    }
  }
  
  onChangeCheckbox(target){
    try {
      this.action[target] = !this.action[target];
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    } catch (error) {
      this.logger.log("Error: ", error);
    }
  }
  

  onChangeButtonSelect(event: {label: string, value: string, disabled: boolean, checked: boolean}){
    this.radioOptions.forEach(el => { el.value ===event.value? el.checked= true: el.checked = false })
    this.action.selectedOption= event.value
    switch (event.value){
      case 'selectedDep':  
        break;
    }
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }
  
  buildForm(): FormGroup {
    return this.formBuilder.group({
      selectedOption: ['all', Validators.required],
      selectedDepartmentId : ['', Validators.nullValidator],
      trueIntent: ['', Validators.required],
      falseIntent: ['', Validators.required]
    })
  }

  setFormValue() {
    this.actionOnlineAgentsFormGroup.patchValue({
      selectedOption: this.action.selectedOption,
      selectedDepartmentId: this.action.selectedDepartmentId,
      trueIntent: this.action.trueIntent,
      falseIntent: this.action.falseIntent
    })
  }

  onChangeSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent' | 'selectedDepartmentId'){
    if(event){
      this.action[type]=event.value
      switch(type){
        case 'trueIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorTrue, toId: this.action.trueIntent})
          break;
        case 'falseIntent':
          this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorFalse, toId: this.action.falseIntent})
          break;
        case 'selectedDepartmentId':
          this.action.selectedDepartmentId = event['_id']
      }
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
  }

  onResetBlockSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent' | 'selectedDepartmentId') {
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