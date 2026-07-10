import { SatPopover } from '@ncstate/sat-popover';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Component, Input, OnInit, SimpleChanges, EventEmitter, Output, HostListener, ViewChild, ElementRef } from '@angular/core';
import { OPERATORS_LIST, OperatorValidator, TYPE_OPERATOR } from '../../../../../../utils';
import { Condition } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'base-condition-row',
  templateUrl: './base-condition-row.component.html',
  styleUrls: ['./base-condition-row.component.scss']
})
export class BaseConditionRowComponent implements OnInit {
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
    this.logger.log('[BASE_CONDITION_ROW] ******* ngOnInit-->');
  }

  ngOnChanges(changes: SimpleChanges){
    this.logger.log('[BASE_CONDITION_ROW] ******* ngOnChanges-->');
    this.conditionForm = this.createConditionGroup()
    this.step=0;
    this.operatorsList = Object.keys(OPERATORS_LIST).map(key => (OPERATORS_LIST[key]))
    if(this.condition){
      this.logger.log('[BASE_CONDITION_ROW] selectedConditionnnn-->', this.condition)
      this.setFormValue()
      this.step = 1;
    }
  }

  createConditionGroup(): FormGroup{
    return this.formBuilder.group({
      type: ["condition", Validators.required],
      operand1 : [ '', Validators.required],
      operator: ['equalAsNumbers', [Validators.required, OperatorValidator]],
      operand2: this.formBuilder.group({
        type: ['const', Validators.required],
        value: ['', Validators.nullValidator],
        name: ['', Validators.nullValidator]
      })
    })
  }

  setFormValue(){
    this.conditionForm.patchValue({
      operand1 : this.condition.operand1,
      operator: this.condition.operator,
      operand2: this.condition.operand2
    });
    if(this.condition.operand2){
      this.setAttributeBtnOperand2 = false;
      if(this.condition.operand2.type === 'var'){
        this.readonlyTextarea = true
      }
    } else {
      this.setAttributeBtnOperand2 = true;
      this.readonlyTextarea = false;
    }
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



  onClearInput(){
    this.conditionForm.patchValue({ operand2: {type: 'const', name: '', value: ''}}, {emitEvent: false})
  }

  onAddCustomAttribute(){
    this.step +=1
    this.disableInput = false
    setTimeout(()=>{
      this.inputOperand1.nativeElement.focus()
    },300)
  }

  onClickOperator(operator: {}){
    this.conditionForm.patchValue({ operator: operator['type']})
    
    // this.disableSubmit = true;
    this.readonlyTextarea = false;
    this.setAttributeBtnOperand2 = true;
    this.canShowOperand2 = true;

    //activate submit button and disable 'Value' textarea i operator is equal to 'isEmpty'
    if(operator['type'] === TYPE_OPERATOR.isEmpty|| 
        operator['type'] === TYPE_OPERATOR.isNull || 
        operator['type'] === TYPE_OPERATOR.isUndefined ){
      
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
