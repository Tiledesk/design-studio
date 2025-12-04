import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
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

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private formBuilder: FormBuilder
  ) { }

  ngOnInit(): void {
    this.logger.log("[ACTION-LEAD-UPDATE] action: ", this.action)
    if(this.action && !this.action.update){
      this.action.update = {};
    }
    this.initialize();
    this.populateForm();
  }


  private initialize() {
    this.leadPropertyFormGroup = this.buildForm();
    // Update the disabled status of the lead property list based on keys present in action.update
    this.leadPropertyListFiltered.forEach(el => Object.keys(this.action.update).includes(el.name)? el.disabled= true:  el.disabled = false)
  }

  buildForm(): FormGroup {
    return this.formBuilder.group({
      update: this.formBuilder.array([])   // <-- the dynamic array of key/value pairs
    });
  }
  
  get update(): FormArray {
    return this.leadPropertyFormGroup.get('update') as FormArray;
  }
  
  populateForm() {
    const entries = Object.entries(this.action.update || {});
  
    if (entries.length === 0) {
      // action.update is empty → add an empty row
      this.update.push(this.formBuilder.group({
        key: [null, Validators.required],
        value: [null, Validators.required]
      }));
    } else {
      // action.update is not empty → populate the form with existing key/value pairs
      entries.forEach(([key, value]) => {
        this.update.push(this.formBuilder.group({
          key: [key, Validators.required],
          value: [value, Validators.required]
        }));
      });
    }
  }

  onChangeSelect(propertySelected: {name: string, value: string}, index: number ){
    this.logger.log("[ACTION-LEAD-UPDATE] onChangeSelect event: ", propertySelected, this.action)
    this.update.at(index).get('key')?.setValue(propertySelected.value);
  }

  onChangeTextarea(text, index: number){
    this.logger.log("[ACTION-LEAD-UPDATE] onChangeTextarea event: ", text, this.action, this.update.at(index))
    this.update.at(index).get('value')?.setValue(text);
    // this.action.update[this.selectedKey]=text;
  }

  onBlur(event, index: number){
    const item = this.update.at(index);
    if (item.valid) {
      const key = item.get('key')!.value;
      const value = item.get('value')!.value;

      // Update action.update
      this.action.update[key] = value;

      // Update the disabled status on the lead property list
      this.updateDisabledList()

      this.updateAndSaveAction.emit();
    }
  }

  onAddNewProperty(){
    this.logger.log("[ACTION-LEAD-UPDATE] onAddNewProperty ADD ")
    const group = this.formBuilder.group({
      key: [null, Validators.required],
      value: [null, Validators.required]
    });
    this.update.push(group);
    // Update the disabled status on the lead property list
    this.updateDisabledList();
  }

  onDeleteProperty(index: number, key: string){
    this.logger.log("[ACTION-LEAD-UPDATE] onDeleteProperty index:", index);
    // 1. Remove the row from the form
    this.update.removeAt(index);
    // 2. Remove the key from action.update
    delete this.action.update[key];
    // 3. Update the disabled status on the lead property list
    this.updateDisabledList();
    // 4. UI handling if action.update is empty

    this.updateAndSaveAction.emit();
  }

  private updateDisabledList() {
    const keys = Object.keys(this.action.update);
  
    this.leadPropertyListFiltered.forEach(el => {
      el.disabled = keys.includes(el.name);
    });
  }

}
