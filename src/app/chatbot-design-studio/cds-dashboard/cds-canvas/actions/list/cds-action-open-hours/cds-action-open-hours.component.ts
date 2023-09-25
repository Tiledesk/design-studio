import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActionOpenHours, Intent } from '../../../../../../models/intent-model';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LoggerService } from 'app/services/logger/logger.service';
import { IntentService } from 'app/chatbot-design-studio/services/intent.service';

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
  
  actionOpenHoursFormGroup: FormGroup
  trueIntentAttributes: any = "";
  falseIntentAttributes: any = "";

  /** CONNECTOR */
  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;
  connector: any;

  listOfIntents: Array<{name: string, value: string, icon?:string}>;

  constructor(
    private formBuilder: FormBuilder,
    private logger: LoggerService,
    private intentService: IntentService,
  ) { }

  ngOnInit(): void {
    this.intentService.isChangedConnector$.subscribe((connector: any) => {
      // this.logger.log('CdsActionIntentComponent isChangedConnector-->', connector);
      this.connector = connector;
      this.updateConnector();
    });
  }

  ngOnChanges() {
    this.initialize()
    if(this.intentSelected){
      this.initializeConnector();
    }
    if (this.action && this.action.trueIntent) {
      this.setFormValue()
    }
  }

  private initializeConnector() {
    // this.isConnected = false;
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected+'/'+this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected+'/'+this.action._tdActionId + '/false';

    this.listOfIntents = this.intentService.getListOfIntents()
  }

  private updateConnector(){
    try {
      const array = this.connector.fromId.split("/");
      const idAction= array[1];
      if(idAction === this.action._tdActionId){
        if(this.connector.deleted){ //TODO: verificare quale dei due connettori è stato eliminato e impostare isConnected a false
          // DELETE 
          // this.logger.log(' deleteConnector :: ', this.connector.id);
          // this.action.intentName = null;
          if(array[array.length -1] === 'true'){
            this.action.trueIntent = null
            this.isConnectedTrue = false
          }        
          if(array[array.length -1] === 'false'){
            this.action.falseIntent = null
            this.isConnectedFalse = false;
          }
          this.updateAndSaveAction.emit();
        } else { //TODO: verificare quale dei due connettori è stato aggiunto (controllare il valore della action corrispondente al true/false intent)
          // ADD / EDIT
          this.logger.log(' updateConnector :: onlineagents', this.connector.toId, this.connector.fromId ,this.action, array[array.length-1]);
          if(array[array.length -1] === 'true'){
            this.isConnectedTrue = true;
            if(this.action.trueIntent !== '#'+this.connector.toId){
              this.action.trueIntent = '#'+this.connector.toId;
              this.updateAndSaveAction.emit();
            } 
          }        
          if(array[array.length -1] === 'false'){
            this.isConnectedFalse = true;
            if(this.action.falseIntent !== '#'+this.connector.toId){
              this.action.falseIntent = '#'+this.connector.toId;
              this.updateAndSaveAction.emit();
            } 
          }
        }
        
      }
    } catch (error) {
      this.logger.log('error: ', error);
    }
  }

  private initialize() {
    this.actionOpenHoursFormGroup = this.buildForm();
    this.actionOpenHoursFormGroup.valueChanges.subscribe(form => {
      this.logger.log('[ACTION-OPEN-HOURS] form valueChanges-->', form)
      if (form && (form.trueIntent !== ''))
        this.action = Object.assign(this.action, this.actionOpenHoursFormGroup.value);
    })
    this.trueIntentAttributes = this.action.trueIntentAttributes;
    this.falseIntentAttributes = this.action.falseIntentAttributes;
  }


  buildForm(): FormGroup {
    return this.formBuilder.group({
      trueIntent: ['', Validators.required],
      falseIntent: ['', Validators.required]
    })
  }

  setFormValue() {
    this.actionOpenHoursFormGroup.patchValue({
      trueIntent: this.action.trueIntent,
      falseIntent: this.action.falseIntent
    })
  }

  onChangeSelect(event:{name: string, value: string}, type : 'trueIntent' | 'falseIntent'){
    if(event){
      this.action[type]=event.value
    }

    switch(type){
      case 'trueIntent':
        this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorTrue, toId: this.action.trueIntent})
        break;
      case 'falseIntent':
        this.onConnectorChange.emit({ type: 'create', fromId: this.idConnectorFalse, toId: this.action.falseIntent})
        break;
    }
    this.updateAndSaveAction.emit();
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
    this.updateAndSaveAction.emit();
  }

  onChangeAttributes(attributes:any, type: 'trueIntent' | 'falseIntent'){
    if(type === 'trueIntent'){
      this.action.trueIntentAttributes = attributes;
    }
    if(type === 'falseIntent'){
      this.action.falseIntentAttributes = attributes;
    }
    this.updateAndSaveAction.emit();
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
