import { FormControl, FormGroup } from '@angular/forms';
import { Component, Input, OnInit, Output, EventEmitter, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { NgSelectComponent } from '@ng-select/ng-select';
import { RESERVED_INTENT_NAMES } from '../../utils';

@Component({
  selector: 'cds-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss']
})
export class SelectComponent implements OnInit {
  @ViewChild('ngSelect', { static: true }) ngSelect: NgSelectComponent;

  @Input() items: any[] = [];
  @Input() itemSelected: any;
  @Input() bindLabelSelect: string;
  @Input() bindValueSelect: string;
  @Input() optionalBindAdditionalText: string; 
  @Input() optionalBindDescription: string; 
  /** If true, renders the optionalBindAdditionalText as a right-aligned badge (opt-in, default false). */
  @Input() additionalTextAsBadge: boolean = false;
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

  RESERVED_INTENT_NAMES = RESERVED_INTENT_NAMES;
  valueFormGroup: FormGroup 
  sortedItems: any[] = [];
  
  constructor() { }

  ngOnInit(): void {
    // empty
  }

  ngOnChanges(changes: SimpleChanges){
    // Ordina items in ordine alfabetico crescente (come cds-panel-intent-list)
    if (changes['items'] || changes['bindLabelSelect'] || changes['groupByKey']) {
      this.sortedItems = this.sortItemsAlphabetically(this.items);
    }

    if (this.itemSelected != null && this.sortedItems?.length && this.bindValueSelect) {
      try {
        const found = this.sortedItems.find(el => el[this.bindValueSelect] === this.itemSelected);
        this.itemSelected = found ? found[this.bindValueSelect] : this.itemSelected;
      } catch (error) {
        console.error('ERROR', error);
      }
    }
  }

  private sortItemsAlphabetically(items: any[]): any[] {
    if (!Array.isArray(items) || items.length === 0) return items || [];
    if (!this.bindLabelSelect) return [...items];

    const labelKey = this.bindLabelSelect;
    const groupKey = this.groupByKey;

    return [...items].sort((a: any, b: any) => {
      // Se è presente il groupByKey, ordina prima per gruppo poi per label
      if (groupKey) {
        const groupA = (a?.[groupKey] ?? '').toString().toLowerCase();
        const groupB = (b?.[groupKey] ?? '').toString().toLowerCase();
        const groupCmp = groupA.localeCompare(groupB);
        if (groupCmp !== 0) return groupCmp;
      }

      const nameA = (a?.[labelKey] ?? '').toString().toLowerCase();
      const nameB = (b?.[labelKey] ?? '').toString().toLowerCase();
      return nameA.localeCompare(nameB);
    });
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
