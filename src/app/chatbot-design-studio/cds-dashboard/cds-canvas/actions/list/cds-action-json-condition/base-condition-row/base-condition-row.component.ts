import { SatPopover } from '@ncstate/sat-popover';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Component, Input, OnInit, SimpleChanges, EventEmitter, Output, HostListener, ViewChild, ElementRef } from '@angular/core';
import { OPERATORS_LIST, OperatorValidator } from 'app/chatbot-design-studio/utils';
import { Condition } from 'app/models/intent-model';
import { LoggerService } from 'app/services/logger/logger.service';

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

  constructor(
    private formBuilder: FormBuilder,
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges){
    this.conditionForm = this.createConditionGroup()
    this.operatorsList = Object.keys(OPERATORS_LIST).map(key => (OPERATORS_LIST[key]))
    
    if(this.condition){
      this.logger.log('[BASE_CONDITION_ROW] selectedConditionnnn-->', this.condition)
      this.setFormValue()
      this.step = 1;
    }
    this.logger.log('******* ngOnChanges-->', this.condition);
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
    } else {
      this.setAttributeBtnOperand2 = true;
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
    if(text && text.match(new RegExp(/(?<=\$\{)(.*)(?=\})/g))){
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
      this.conditionForm.patchValue({ operand2: {type:'var', name:variableSelected.name, value:variableSelected.value}}, {emitEvent: false});
      this.logger.log('formmmmm', this.conditionForm);
      this.disableSubmit = false;
      this.readonlyTextarea = true;
      this.setAttributeBtnOperand2 = false;
    }
    this.logger.log('******* onVariableSelected-->', step, variableSelected);
  }

  onClearSelectedAttribute(){
    this.logger.log('onClearSelectedAttribute-->');   
    this.conditionForm.patchValue({ operand2: {type: 'var', name: ''}}, {emitEvent: false});
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
  }

  onSubmitCondition(){
    this.logger.log('onSubmitCondition-->', this.conditionForm)
    if(this.conditionForm.valid){
      let condition: Condition = new Condition()
      condition = Object.assign(condition, this.conditionForm.value);
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
