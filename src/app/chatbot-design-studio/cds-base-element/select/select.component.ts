import { FormControl, FormGroup } from '@angular/forms';
import { Component, Input, OnInit, Output, EventEmitter, ViewChild } from '@angular/core';
import { NgSelectComponent } from '@ng-select/ng-select';

@Component({
  selector: 'cds-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss']
})
export class SelectComponent implements OnInit {
  @ViewChild('ngSelect', { static: true }) ngSelect: NgSelectComponent;

  @Input() items: []
  @Input() itemSelected: any
  @Input() bindLabelSelect: string;
  @Input() bindValueSelect: string;
  @Input() optionalBindAdditionalText: string; 
  @Input() optionalBindDescription: string; 
  @Input() groupByKey: string; 
  @Input() footerButton: boolean = false;
  @Input() footerButtonDisabled: boolean = false;
  @Input() footerButtonIcon: string;
  @Input() footerButtonText: string;

  @Input() deleteButton: boolean = false;
  @Input() clearable: boolean = false;
  @Input() searchable: boolean = false;
  @Input() placeholder: string = 'Select an option'
  @Input() formGroup: FormGroup = new FormGroup({ select: new FormControl()});
  @Input() formControlName: string = 'select';
  @Output() onSelected = new EventEmitter();
  @Output() onReset = new EventEmitter();
  @Output() onDeleted = new EventEmitter();

  valueFormGroup: FormGroup 
  
  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(){
    if(this.itemSelected && this.items){
      //   this.itemSelected = this.items.find(el => el[this.bindValueSelect] === this.itemSelected)
      try {
        this.itemSelected = this.items.find(el => el[this.bindValueSelect] === this.itemSelected)[this.bindValueSelect]
      } catch (error) {
        console.error('ERROR', error);
      }
      
    }
  }

  onChangeActionButton(event) {
    if(event){
      this.itemSelected = event[this.bindValueSelect];
      this.onSelected.emit(event);
    }
  }

  onResetValue(event){
    this.itemSelected = null
    this.onReset.emit(null)
  }

  onOpen(){
  }

  onFooterButtonClick(event) {
    this.onSelected.emit({ clickEvent: 'footer'});
  }

  onDeleteButtonClick(event) {
    this.onDeleted.emit(event);
  }

  onClose(){
    this.ngSelect.blur();
  }

}
