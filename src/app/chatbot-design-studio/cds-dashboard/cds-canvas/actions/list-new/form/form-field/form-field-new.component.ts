import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';

@Component({
  selector: 'appdashboard-form-field-new',
  templateUrl: './form-field-new.component.html',
  styleUrls: ['./form-field-new.component.scss']
})
export class FormFieldNewComponent implements OnInit, OnChanges {

  @Output() eventEditField = new EventEmitter();
  @Output() openDeleteFieldModal = new EventEmitter();
  @Output() eventDropField = new EventEmitter();

  @Input() fields: [any];

  selectedObjectId: number;
  selectedField: any;

  constructor() {}

  ngOnInit(): void {
    this.selectedObjectId = null;
  }

  ngOnChanges() {}

  moveField(from: number, to: number) {
    if (to < 0 || to >= this.fields.length) return;
    const item = this.fields.splice(from, 1)[0];
    this.fields.splice(to, 0, item);
    this.eventDropField.emit(this.fields);
  }

  deleteFieldModal(index: number) {
    this.openDeleteFieldModal.emit(index);
  }

  editField(index: number) {
    this.selectedObjectId = index;
    this.eventEditField.emit(index);
  }

}
