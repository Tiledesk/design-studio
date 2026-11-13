import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { IntentService } from '../../../../../services/intent.service';
import { Intent } from 'src/app/models/intent-model';
import { ActionOnlineAgent } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { TYPE_UPDATE_ACTION } from '../../../../../utils';


@Component({
  selector: 'cds-action-online-agents',
  templateUrl: './cds-action-online-agents.component.html',
  styleUrls: ['./cds-action-online-agents.component.scss']
})
export class CdsActionOnlineAgentsComponent implements OnInit {

  // @Input() listOfActions: Array<{name: string, value: string, icon?:string}>;
  @Input() intentSelected: Intent;
  @Input() action: ActionOnlineAgent;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()
  
  actionOnlineAgentsFormGroup: FormGroup
  trueIntentAttributes: string = "";
  falseIntentAttributes: string = "";

  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  
  listOfIntents: Array<{name: string, value: string, icon?:string}>;

  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private formBuilder: FormBuilder,
    private intentService: IntentService,
  ) { }

  ngOnInit(): void {
    this.initialize();
  }

  /** */
  ngOnDestroy() {
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
  }
  

  private initializeConnector() {
    // this.isConnected = false;
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected+'/'+this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected+'/'+this.action._tdActionId + '/false';
    this.listOfIntents = this.intentService.getListOfIntents();
  }

  


  



  buildForm(): FormGroup {
    return this.formBuilder.group({
      trueIntent: ['', Validators.required],
      falseIntent: ['', Validators.required]
    })
  }

  setFormValue() {
    this.actionOnlineAgentsFormGroup.patchValue({
      trueIntent: this.action.trueIntent,
      falseIntent: this.action.falseIntent
    })
  }

  onChangeSelect(event:{name: string, value: string}, type: 'trueIntent' | 'falseIntent'){
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
