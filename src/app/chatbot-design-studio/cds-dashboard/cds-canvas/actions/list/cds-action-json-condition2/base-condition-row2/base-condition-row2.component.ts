import { SatPopover } from '@ncstate/sat-popover';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Component, Input, OnInit, SimpleChanges, EventEmitter, Output, HostListener, ViewChild, ElementRef } from '@angular/core';
import { OPERATORS_LIST_V2, OperatorValidatorV2 } from '../../../../../../utils';
import { UNARY_OPERATORS, stripLiquidWrapper, normalizeLegacyOperator } from '../../../../../../utils-condition';
import { Condition } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'base-condition-row2',
  templateUrl: './base-condition-row2.component.html',
  styleUrls: ['./base-condition-row2.component.scss']
})
export class BaseConditionRow2Component implements OnInit {
  @ViewChild('operand1') inputOperand1: ElementRef;
  @Input() condition: Condition;
  @Output() close = new EventEmitter();

  textVariable: string = '';
  filteredVariableList: Array<{name: string, value: string}> = []
  filteredIntentVariableList: Array<{name: string, value: string, src?: string}>
  operatorsList: Array<{}> = []
  step: number = 0;
  disableInput: boolean = true;
  disableSubmit: boolean = true;
  conditionForm: FormGroup;
  readonlyTextarea: boolean = false;
  setAttributeBtnOperand2: boolean = false;
  canShowOperand2: boolean = true

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private formBuilder: FormBuilder
  ) { }

  ngOnInit(): void {
    this.logger.log('[BASE_CONDITION_ROW2] ******* ngOnInit-->');
  }

  ngOnChanges(changes: SimpleChanges){
    this.logger.log('[BASE_CONDITION_ROW2] ******* ngOnChanges-->');
    this.conditionForm = this.createConditionGroup()
    this.step=0;
    this.operatorsList = Object.keys(OPERATORS_LIST_V2).map(key => (OPERATORS_LIST_V2[key]))
    if(this.condition){
      this.logger.log('[BASE_CONDITION_ROW2] selectedConditionnnn-->', this.condition)
      this.setFormValue()
      this.step = 1;
    }
  }

  createConditionGroup(): FormGroup{
    return this.formBuilder.group({
      type: ["condition", Validators.required],
      operand1 : [ '', Validators.required],
      operator: ['', [Validators.required, OperatorValidatorV2]], // nessun operatore di default: l'utente deve sceglierlo
      operand2: this.formBuilder.group({
        type: ['const', Validators.required],
        value: ['', Validators.nullValidator],
        name: ['', Validators.nullValidator]
      })
    })
  }

  setFormValue(){
    const normalizedOperator = normalizeLegacyOperator(this.condition.operator);
    // Retrocompat: operand2 può essere un formato molto vecchio (stringa/numero) invece di
    // { type, value, name }. In quel caso lo normalizziamo a costante per non perdere il valore in edit.
    const rawOperand2: any = this.condition.operand2;
    const operand2 = (rawOperand2 && typeof rawOperand2 === 'object')
      ? rawOperand2
      : (rawOperand2 === null || rawOperand2 === undefined)
        ? rawOperand2
        : { type: 'const', value: String(rawOperand2), name: '' };

    this.conditionForm.patchValue({
      operand1 : stripLiquidWrapper(this.condition.operand1),
      operator: normalizedOperator,
      operand2: operand2
    });
    if(operand2){
      this.setAttributeBtnOperand2 = false;
      if(operand2.type === 'var'){
        this.readonlyTextarea = true
      }
    } else {
      this.setAttributeBtnOperand2 = true;
      this.readonlyTextarea = false;
    }
    // Unary operators have no Value: hide the field when reopening a saved condition.
    // Usa l'operatore NORMALIZZATO (un legacy *IgnoreCase non è unario).
    this.canShowOperand2 = !UNARY_OPERATORS.has(normalizedOperator);
}

/** START EVENTS cds-textarea **/
  onChangeTextArea(text: string){
    this.logger.log('textttt', text, text.match(new RegExp(/(?<=\{\{)(.*)(?=\}\})/g)));
    if(text){
      this.disableSubmit = false;
      this.setAttributeBtnOperand2 = false;
    }else{
      this.disableSubmit = true;
      this.setAttributeBtnOperand2 = true;
    }
    if(text && text.match(new RegExp(/(?<=\{\{)(.*)(?=\}\})/g))){
      text.match(new RegExp(/(?<=\{\{)(.*)(?=\}\})/g)).forEach(match => {
        text = text.replace(text,match)
        this.conditionForm.patchValue({ operand2: {type: 'const', name: text}}, {emitEvent: false})
      });
    } 
  }

  onSelectedAttribute(variableSelected: {name: string, value: string}, step: number){ 
    this.logger.log('1 onVariableSelected-->', step, this.conditionForm, variableSelected);
    if(step === 0){
      this.conditionForm.patchValue({ operand1: variableSelected.value}, {emitEvent: false})
      this.step +=1;
    }else if (step == 1){
      this.conditionForm.patchValue({ operand2: { type: 'var', name: variableSelected.name, value: variableSelected.value}}, {emitEvent: false});
      this.logger.log('formmmmm', this.conditionForm);
      this.readonlyTextarea = true;
      this.setAttributeBtnOperand2 = false;
      this.disableSubmit = false;
    }
    this.logger.log('******* onVariableSelected-->', step, variableSelected);
  }

  onClearSelectedAttribute(){
    this.logger.log('onClearSelectedAttribute-->');
    this.conditionForm.patchValue({ operand2: {type: 'const', name: '', value: ''}}, {emitEvent: false})
    this.disableSubmit = true;
    this.readonlyTextarea = false;
    this.setAttributeBtnOperand2 = true;
  }
  /** END EVENTS cds-textarea **/

  /** START EVENTS cds-textarea operand1 (Attribute name) — editable + attribute picker **/
  onChangeOperand1(text: string){
    // Editable attribute name: keep operand1 in sync with the textarea text (typed or edited).
    this.conditionForm.patchValue({ operand1: text ?? '' }, { emitEvent: false });
  }

  onSelectedAttributeOperand1(variableSelected: { name: string, value: string }){
    // Insert the bare attribute path (no {{ }} wrapper), appended to any existing text.
    const current = this.conditionForm.value.operand1 || '';
    this.conditionForm.patchValue({ operand1: current + variableSelected.value }, { emitEvent: false });
  }
  /** END EVENTS cds-textarea operand1 **/



  onClearInput(){
    this.conditionForm.patchValue({ operand2: {type: 'const', name: '', value: ''}}, {emitEvent: false})
  }

  onAddCustomAttribute(){
    this.step +=1
    this.disableInput = false
    setTimeout(()=>{
      this.inputOperand1?.nativeElement?.focus()
    },300)
  }

  onClickOperator(operator: {}){
    this.conditionForm.patchValue({ operator: operator['type']})

    // this.disableSubmit = true;
    this.readonlyTextarea = false;
    this.setAttributeBtnOperand2 = true;
    this.canShowOperand2 = true;

    // Unary operators (isEmpty/isNotEmpty/isNull/isUndefined/exists/doesNotExist/isTrue/isFalse):
    // no Value needed -> hide the 'Value' textarea and enable submit.
    if(UNARY_OPERATORS.has(operator['type'])){

      this.onClearInput()
      this.canShowOperand2 = false

      this.disableSubmit = false;
      this.readonlyTextarea = true;
      this.setAttributeBtnOperand2 = false;
    }
  }

  onSubmitCondition(){
    this.logger.log('onSubmitCondition-->', this.conditionForm)
    if(this.conditionForm.valid){
      let condition: Condition = new Condition()
      condition = Object.assign(condition, this.conditionForm.value);
      condition.operand2.type == 'var'? condition.operand2.name = condition.operand2.value: null;
      this.step = 0;
      this.conditionForm = this.createConditionGroup()
      this.close.emit(condition)
    }
  }

  onClose(){
    this.logger.log('onClose pressed')
    this.step = 0;
    this.disableInput = true
    this.conditionForm = this.createConditionGroup()
    this.close.emit() // CLOSE BASE-FILTER POPOVER (IN PARENT)
  }

  onDeleteInputField(){
    this.conditionForm.patchValue({ operand1:'' }, {emitEvent: false});
  }

  private _filter(value: string, array: Array<any>): Array<any> {
    const filterValue = value.toLowerCase();
    return array.filter(option => option.name.toLowerCase().includes(filterValue));
  }

  @HostListener('document:keydown', ['$event'])
  onKeyPress(event){
    const keyCode = event.which || event.keyCode;
    if (keyCode === 27) { // Esc keyboard code
      this.onClose();
    }
  }

}
