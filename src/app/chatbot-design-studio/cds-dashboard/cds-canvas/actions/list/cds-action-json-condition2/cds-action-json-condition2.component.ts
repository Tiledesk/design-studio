import { TYPE_UPDATE_ACTION, OPERATORS_LIST_V2, OperatorValidatorV2 } from '../../../../../utils';
import { Intent } from 'src/app/models/intent-model';
import { ActionJsonCondition2, Expression, Operator } from 'src/app/models/action-model';
import { Component, EventEmitter, Host, Input, OnInit, Output, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { SatPopover } from '@ncstate/sat-popover';
import { IntentService } from '../../../../../services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { Subscription } from 'rxjs/internal/Subscription';
import { ConnectorService } from 'src/app/chatbot-design-studio/services/connector.service';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';
import { serializeConditionToWhen, normalizeLegacyOperator, operatorLabelKey, operandRightDisplay } from 'src/app/chatbot-design-studio/utils-condition';

@Component({
  selector: 'cds-action-json-condition2',
  templateUrl: './cds-action-json-condition2.component.html',
  styleUrls: ['./cds-action-json-condition2.component.scss']
})
export class CdsActionJsonCondition2Component implements OnInit {

  @ViewChild("addFilter", {static: false}) myPopover : SatPopover;
  
  @Input() intentSelected: Intent;
  @Input() action: ActionJsonCondition2;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()
  
  actionJsonConditionFormGroup: FormGroup
  trueIntentAttributes: string = "";
  falseIntentAttributes: string = "";
  booleanOperators=[ { type: 'AND', operator: 'AND'},{ type: 'OR', operator: 'OR'},]
  OPERATORS_LIST = OPERATORS_LIST_V2;
  
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

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private formBuilder: FormBuilder,
    private intentService: IntentService,
    private connectorService: ConnectorService
    ) { }

    ngOnInit(): void {
      this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
        this.logger.log('CdsActionJsonCondition2Component isChangedConnector-->', connector);
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
    //   this.logger.log('[ACTION-JSON-CONDITION2] actionnn-->', this.action)
    //   if (this.action) {
    //     this.setFormValue()
    //   }
    // }
  
    
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
      this.logger.log('[ACTION-JSON-CONDITION2] updateConnector:');
      const resp = updateConnector(this.connector, this.action, this.isConnectedTrue, this.isConnectedFalse, this.idConnectionTrue, this.idConnectionFalse);
      if(resp){
        this.isConnectedTrue    = resp.isConnectedTrue;
        this.isConnectedFalse   = resp.isConnectedFalse;
        this.idConnectionTrue   = resp.idConnectionTrue;
        this.idConnectionFalse  = resp.idConnectionFalse;
        this.logger.log('[ACTION-JSON-CONDITION2] updateConnector:', resp);
        if (resp.emit) {
          this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
        } 
      }
    }
    
  
    private initialize() {
      this.actionJsonConditionFormGroup = this.buildForm();
      this.actionJsonConditionFormGroup.valueChanges.subscribe(form => {
        this.logger.log('[ACTION-JSON-CONDITION2] form valueChanges-->', form)
        if(form && (form.trueIntent !== '' || form.falseIntent !== '' ||  form.stopOnConditionMet !== '')){
          this.action.trueIntent = this.actionJsonConditionFormGroup.value.trueIntent
          this.action.falseIntent = this.actionJsonConditionFormGroup.value.falseIntent
          this.action.stopOnConditionMet = this.actionJsonConditionFormGroup.value.stopOnConditionMet
          // this.action = Object.assign(this.action, this.actionJsonConditionFormGroup.value)
        }
      })
      this.trueIntentAttributes = this.action.trueIntentAttributes;
      this.falseIntentAttributes = this.action.falseIntentAttributes;
      if(this.intentSelected){
        this.initializeConnector();
      }
      this.logger.log('[ACTION-JSON-CONDITION2] actionnn-->', this.action)
      if (this.action) {
        this.migrateLegacyOperators(); // retrocompat: normalizza gli operatori legacy sull'AST in apertura
        this.setFormValue()
        this.updateWhen(); // popola `when` anche per le action già salvate (vecchio formato senza `when`)
      }
      // ordina listOfIntents per name
      this.listOfIntents.sort((a, b) => a.name.localeCompare(b.name));
    }

    /** Rigenera l'unica stringa `when` (campo derivato, root azione) da tutto l'AST `groups`. Retrocompatibile: non tocca `groups`. */
    private updateWhen(){
      if(this.action){
        this.action.when = serializeConditionToWhen(this.action.groups);
      }
    }

    /**
     * Retrocompat: normalizza gli operatori legacy (es. *IgnoreCase) su tutto l'AST `groups`,
     * così UI/preview e `when` sono coerenti e la conversione case-sensitive è esplicita
     * (non silenziosa al primo salvataggio). Solo in memoria: viene persistito al primo save.
     */
    private migrateLegacyOperators(){
      if(!this.action || !Array.isArray(this.action.groups)) return;
      this.action.groups.forEach((node: any) => {
        if(node && node.type === 'expression' && Array.isArray(node.conditions)){
          node.conditions.forEach((c: any) => {
            if(c && c.type === 'condition' && c.operator){
              c.operator = normalizeLegacyOperator(c.operator);
            }
          });
        }
      });
    }

    /** Etichetta operatore robusta a formati legacy/sconosciuti (no crash). Usata nel template preview. */
    operatorLabel(operator: string): string {
      return operatorLabelKey(operator);
    }

    /** Lato destro (operand2) robusto a formati vecchi/nuovi (no crash). Usata nel template preview. */
    operandRightDisplay(condition: any): string {
      return operandRightDisplay(condition);
    }
  
    private setFormValue(){
      this.actionJsonConditionFormGroup.patchValue({
        trueIntent: this.action.trueIntent,
        falseIntent: this.action.falseIntent,
        stopOnConditionMet: this.action.stopOnConditionMet,
        // groups: this.action.groups,
      })
    }
  
    buildForm(): FormGroup{
      return this.formBuilder.group({
        trueIntent: ['', Validators.required],
        falseIntent: ['', Validators.required],
        stopOnConditionMet: [false, Validators.required],
        // groups: this.formBuilder.array([
        //   this.createExpressionGroup(),
        //   // this.createOperatorGroup()
        // ]) 
      })
    }
  
    createExpressionGroup(): FormGroup{
      return this.formBuilder.group({
        type:["expression", Validators.required],
        conditions: this.formBuilder.array([
          // this.createConditionGroup(), this.createOperatorGroup()
        ])
      })
    }
  
    createConditionGroup(): FormGroup{
      return this.formBuilder.group({
        type: ["condition", Validators.required],
        operand1 : [ '', Validators.required],
        operator: ['', Validators.required, OperatorValidatorV2],
        operand2: ['', Validators.required]
      })
    }
  
    createOperatorGroup(): FormGroup{
      return this.formBuilder.group({
        type: ["operator", Validators.required],
        operator: [ '', Validators.required]
      })
    }
  
  
    onClickAddGroup(){
      this.action.groups.push(new Operator())
      this.action.groups.push(new Expression())
      this.logger.log('onClickAddGroup-->', this.action)
      // let groups = this.actionJsonConditionFormGroup.get('groups') as FormArray
      // groups.push(this.createOperatorGroup(), {emitEvent: false})
      // groups.push(this.createExpressionGroup(), {emitEvent: false})
      this.updateWhen();
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }

    onDeleteGroup(index: number, last: boolean){
      this.logger.log('onDeleteGroup', index, last, this.action.groups)
      if(!last){
        this.action.groups.splice(index, 2)
      }else if(last){
        this.action.groups.splice(index-1, 2)
      }
      if(this.action.groups.length === 0){
        this.action.groups.push(new Expression());
        // let groups = this.actionJsonConditionFormGroup.get('groups') as FormArray
        // groups.push(this.createExpressionGroup(), {emitEvent: false})
      }
      this.updateWhen();
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }

    onChangeOperator(event, index: number){
      (this.action.groups[index] as Operator).operator = event['type']
      this.logger.log('onChangeOperator actionsss', this.action, this.actionJsonConditionFormGroup)
      this.updateWhen();
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    }
  
    onChangeForm(event:{name: string, value: string}, type : 'trueIntent' | 'falseIntent'){
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
  
    onChangeExpression(event){
      // this.connectorService.updateConnector(this.intentSelected.intent_id);
      this.logger.log('onChangeExpression actionsss', this.action, event)
      this.updateWhen();
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
  
    onStopConditionMeet() {
      try {
        this.action.stopOnConditionMet = !this.action.stopOnConditionMet;
        this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
      } catch (error) {
        this.logger.log("Error: ", error);
      }
    }
  
  }
  