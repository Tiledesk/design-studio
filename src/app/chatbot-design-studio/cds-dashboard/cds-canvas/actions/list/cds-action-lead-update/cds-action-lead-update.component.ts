import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { leadPropertyList } from 'src/app/chatbot-design-studio/utils-variables';
import { ActionLeadUpdate } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-lead-update',
  templateUrl: './cds-action-lead-update.component.html',
  styleUrls: ['./cds-action-lead-update.component.scss']
})
export class CdsActionLeadUpdateComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionLeadUpdate;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  
  leadPropertyFormGroup: FormGroup
  leadPropertyListFiltered = leadPropertyList;

  showPlaceholder: boolean = false;
  showCards: boolean = false
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private formBuilder: FormBuilder
  ) { }

  ngOnInit(): void {
    this.logger.log("[ACTION-LEAD-UPDATE] action: ", this.action)
    if(this.action && !this.action.update){
      this.action.update = {};
    }
    if(this.action && Object.keys(this.action.update).length > 0){
      this.showCards = true
      this.showPlaceholder = false;
    }
    if(this.action && Object.keys(this.action.update).length === 0){
      this.showCards = false;
      this.showPlaceholder = true;
    }
    this.initialize();
  }


  private initialize() {
    this.leadPropertyFormGroup = this.buildForm();
    this.leadPropertyListFiltered.forEach(el => Object.keys(this.action.update).includes(el.name)? el.disabled= true:  el.disabled = false)
  }

  buildForm(): FormGroup{
    return this.formBuilder.group({
      key: [, Validators.required],
      value: ['', Validators.required]
    })
  }

  onChangeSelect(propertySelected: {name: string, value: string} ){
    this.logger.log("[ACTION-LEAD-UPDATE] onChangeSelect event: ", propertySelected, this.action)
    this.leadPropertyFormGroup.patchValue({ key: propertySelected.value})
  }

  onChangeTextarea(text){
    this.logger.log("[ACTION-LEAD-UPDATE] onChangeTextarea event: ", text, this.action)
    this.leadPropertyFormGroup.patchValue({ value: text})
    // this.action.update[this.selectedKey]=text;
  }

  onBlur(event){
    if(this.leadPropertyFormGroup.valid){
      let form = this.leadPropertyFormGroup.value
      this.action.update[form.key] = form.value;
      this.showPlaceholder = false;
      this.showCards = true;
      this.leadPropertyListFiltered.forEach(el => Object.keys(this.action.update).includes(el.name)? el.disabled= true:  el.disabled = false)
      this.leadPropertyFormGroup.reset();
      this.updateAndSaveAction.emit();
    }
  }

  onAddNewProperty(){
    this.logger.log("[ACTION-LEAD-UPDATE] onAddNewProperty ADD : ", this.showPlaceholder)
    this.leadPropertyListFiltered.forEach(el => Object.keys(this.action.update).includes(el.name)? el.disabled= true:  el.disabled = false)
    this.showPlaceholder = true;
  }

  onDeleteProperty(index: number, key: string){
    this.logger.log("[ACTION-LEAD-UPDATE] onDeleteProperty index : ", index)
    delete this.action.update[key];
    this.leadPropertyListFiltered.forEach(el => Object.keys(this.action.update).includes(el.name)? el.disabled= true:  el.disabled = false)
    if(this.action && Object.keys(this.action.update).length === 0){
      this.showCards = false;
      this.showPlaceholder = true;
    }
    this.updateAndSaveAction.emit();
  }

}
