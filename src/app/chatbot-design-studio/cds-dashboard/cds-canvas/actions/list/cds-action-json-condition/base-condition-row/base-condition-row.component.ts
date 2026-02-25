import { Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Condition } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { OPERATORS_LIST, OperatorValidator, TYPE_OPERATOR } from '../../../../../../utils';

@Component({
  selector: 'base-condition-row',
  templateUrl: './base-condition-row.component.html',
  styleUrls: ['./base-condition-row.component.scss']
})
export class BaseConditionRowComponent implements OnInit, OnChanges {
  @ViewChild('operand1') inputOperand1: ElementRef;
  @Input() condition: Condition;
  @Output() close = new EventEmitter();

  operatorsList: Array<{}> = [];
  step: number = 0;
  disableInput: boolean = true;
  disableSubmit: boolean = true;
  conditionForm: FormGroup;
  readonlyTextarea: boolean = false;
  setAttributeBtnOperand2: boolean = false;
  canShowOperand2: boolean = true;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private formBuilder: FormBuilder
  ) { }

  /** Inizializza la lista operatori (usata nel template). */
  ngOnInit(): void {
    this.logger.log('[BASE_CONDITION_ROW] ******* ngOnInit-->');
    this.operatorsList = Object.keys(OPERATORS_LIST).map(key => OPERATORS_LIST[key]);
  }

  /** All’arrivo di condition: resetta form e step, eventualmente imposta valori e step 1. */
  ngOnChanges(changes: SimpleChanges): void {
    this.logger.log('[BASE_CONDITION_ROW] ******* ngOnChanges-->');
    this.conditionForm = this.createConditionGroup();
    this.step = 0;
    if (this.condition) {
      this.logger.log('[BASE_CONDITION_ROW] selectedConditionnnn-->', this.condition);
      this.setFormValue();
      this.step = 1;
    }
  }

  /** Crea il FormGroup per una singola condizione (operandi, operatore, operand2). */
  private createConditionGroup(): FormGroup {
    return this.formBuilder.group({
      type: ['condition', Validators.required],
      operand1: ['', Validators.required],
      operator: ['equalAsNumbers', [Validators.required, OperatorValidator]],
      operand2: this.formBuilder.group({
        type: ['const', Validators.required],
        value: ['', Validators.nullValidator],
        name: ['', Validators.nullValidator]
      })
    });
  }

  private setFormValue(): void {
    this.conditionForm.patchValue({
      operand1: this.condition.operand1,
      operator: this.condition.operator,
      operand2: this.condition.operand2
    });
    if (this.condition.operand2) {
      this.setAttributeBtnOperand2 = false;
      if (this.condition.operand2.type === 'var') {
        this.readonlyTextarea = true;
      }
    } else {
      this.setAttributeBtnOperand2 = true;
      this.readonlyTextarea = false;
    }
  }

  /** Aggiorna stato submit/operand2 in base al testo della textarea (gestione placeholder {{ }}). */
  onChangeTextArea(text: string): void {
    this.logger.log('textttt', text, text.match(new RegExp(/(?<=\{\{)(.*)(?=\}\})/g)));
    if (text) {
      this.disableSubmit = false;
      this.setAttributeBtnOperand2 = false;
    } else {
      this.disableSubmit = true;
      this.setAttributeBtnOperand2 = true;
    }
    if (text && text.match(new RegExp(/(?<=\{\{)(.*)(?=\}\})/g))) {
      text.match(new RegExp(/(?<=\{\{)(.*)(?=\}\})/g)).forEach(match => {
        text = text.replace(text, match);
        this.conditionForm.patchValue({ operand2: { type: 'const', name: text } }, { emitEvent: false });
      });
    }
  }

  /** Imposta operand1 (step 0) o operand2 (step 1) con la variabile selezionata dalla lista. */
  onSelectedAttribute(variableSelected: { name: string; value: string }, step: number): void {
    this.logger.log('1 onVariableSelected-->', step, this.conditionForm, variableSelected);
    if (step === 0) {
      this.conditionForm.patchValue({ operand1: variableSelected.value }, { emitEvent: false });
      this.step += 1;
    } else if (step === 1) {
      this.conditionForm.patchValue({ operand2: { type: 'var', name: variableSelected.name, value: variableSelected.value } }, { emitEvent: false });
      this.logger.log('formmmmm', this.conditionForm);
      this.readonlyTextarea = true;
      this.setAttributeBtnOperand2 = false;
      this.disableSubmit = false;
    }
    this.logger.log('******* onVariableSelected-->', step, variableSelected);
  }

  /** Resetta operand2 a tipo const vuoto e riabilita il campo valore. */
  onClearSelectedAttribute(): void {
    this.logger.log('onClearSelectedAttribute-->');
    this.conditionForm.patchValue({ operand2: { type: 'const', name: '', value: '' } }, { emitEvent: false });
    this.disableSubmit = true;
    this.readonlyTextarea = false;
    this.setAttributeBtnOperand2 = true;
  }

  /** Svuota il campo valore (operand2) del form. */
  onClearInput(): void {
    this.conditionForm.patchValue({ operand2: { type: 'const', name: '', value: '' } }, { emitEvent: false });
  }

  /** Passa allo step di inserimento manuale attributo e fa focus sull’input. */
  onAddCustomAttribute(): void {
    this.step += 1;
    this.disableInput = false;
    setTimeout(() => {
      this.inputOperand1.nativeElement.focus();
    }, 300);
  }

  /** Imposta l’operatore della condizione; per isEmpty/isNull/isUndefined nasconde il campo valore. */
  onClickOperator(operator: { type?: string }): void {
    this.conditionForm.patchValue({ operator: operator['type'] });
    this.readonlyTextarea = false;
    this.setAttributeBtnOperand2 = true;
    this.canShowOperand2 = true;

    if (operator['type'] === TYPE_OPERATOR.isEmpty || 
        operator['type'] === TYPE_OPERATOR.isNull || 
        operator['type'] === TYPE_OPERATOR.isUndefined ){
      
      this.onClearInput();
      this.canShowOperand2 = false;
      this.disableSubmit = false;
      this.readonlyTextarea = true;
      this.setAttributeBtnOperand2 = false;
    }
  }

  /** Valida il form, costruisce la Condition, emette al parent e resetta lo step. */
  onSubmitCondition(): void {
    this.logger.log('onSubmitCondition-->', this.conditionForm);
    if (this.conditionForm.valid) {
      const condition: Condition = Object.assign(new Condition(), this.conditionForm.value);
      if (condition.operand2.type === 'var') {
        condition.operand2.name = condition.operand2.value;
      }
      this.step = 0;
      this.conditionForm = this.createConditionGroup();
      this.close.emit(condition);
    }
  }

  /** Chiude il popover senza salvare: resetta form e step, emette close. */
  onClose(): void {
    this.logger.log('onClose pressed');
    this.step = 0;
    this.disableInput = true;
    this.conditionForm = this.createConditionGroup();
    this.close.emit();
  }

  /** Svuota il campo operand1 del form. */
  onDeleteInputField(): void {
    this.conditionForm.patchValue({ operand1: '' }, { emitEvent: false });
  }

  /** Chiude il popover alla pressione di Esc. */
  @HostListener('document:keydown', ['$event'])
  onKeyPress(event: KeyboardEvent): void {
    const keyCode = (event as any).which || (event as any).keyCode;
    if (keyCode === 27) {
      this.onClose();
    }
  }

  /** trackBy per l’*ngFor sugli operatori (stabilizza il render). */
  trackByOperatorType(index: number, item: { type?: string }): string | number {
    return item?.type ?? index;
  }

}
