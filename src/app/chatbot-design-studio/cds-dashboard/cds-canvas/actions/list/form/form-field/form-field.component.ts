import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';

@Component({
  selector: 'appdashboard-form-field',
  templateUrl: './form-field.component.html',
  styleUrls: ['./form-field.component.scss']
})
export class FormFieldComponent implements OnInit, OnChanges {

  @Output() eventEditField = new EventEmitter();
  @Output() openDeleteFieldModal = new EventEmitter();
  @Output() eventDropField = new EventEmitter();
  
  @Input() fields: [any];

  // modal
  displayMODAL = false;
  translateMap: any;
  selectedObjectId: number;

  // add edit form
  selectedField: any;

  
  constructor() { 
    // void
  }

  ngOnInit(): void {
    this.selectedObjectId = null;
  }

  ngOnChanges() {
    // console.log('[FORM-FIELD] fields ', this.fields)
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.fields, event.previousIndex, event.currentIndex);
    this.selectedField = null;
    this.eventDropField.emit(this.fields);
  }

  logValue() {
    // console.log(this.fields);
  }

  // EVENTS //
  /** Event modal open delete field */
  deleteFieldModal(index:number) {
    this.openDeleteFieldModal.emit(index);
  }

  /** Event edit field */
  editField(index:number){
    this.selectedObjectId = index;
    this.eventEditField.emit(index);
  }

}
