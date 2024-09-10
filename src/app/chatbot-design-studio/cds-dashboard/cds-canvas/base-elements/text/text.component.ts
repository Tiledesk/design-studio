import { Component, Input, OnInit, Output, EventEmitter, SimpleChanges, ViewChild, ElementRef, SimpleChange, HostListener } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { SatPopover } from '@ncstate/sat-popover';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'cds-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.scss']
})
export class CDSTextComponent implements OnInit {

  @ViewChild('input_text', {read:ElementRef}) myInput: ElementRef<HTMLInputElement>;
  @ViewChild('input_text', { read: MatAutocompleteTrigger }) autoComplete: MatAutocompleteTrigger;
  @ViewChild("addVariable") addVariable: SatPopover;
  @ViewChild("utils", {read:ElementRef}) utilsComponent: ElementRef<HTMLElement>;
  
  // @Input() textMessage: string;
  @Input() control: FormControl<string> = new FormControl()
  @Input() text: string;
  @Input() placeholder: string;
  @Input() customPrefix: boolean;
  @Input() disabled: boolean = false;
  @Input() autocompleteOptions: string[] = [];
  @Input() inputType: string = "text";
  @Input() showUtils: boolean = true;
  @Input() setAttributeBtn: boolean = true;
  @Input() readonly: boolean = false;
  @Output() blur = new EventEmitter();
  @Output() onChange = new EventEmitter<string>();
  @Output() selectedAttribute = new EventEmitter();
  
  filteredOptions: Observable<string[]>;
  constructor() { }

  ngOnInit(): void {
    if(this.text){
      this.control.patchValue(this.text)
    }else{
      this.text = this.control.value
    }
    this.filteredOptions = this.control.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || ''))
    );
    window.addEventListener('scroll', this.onWindowScroll, true);
  }

  onWindowScroll= (event: any)=> {
    if(this.autoComplete.panelOpen)
      // this.autoComplete.closePanel();
      this.autoComplete.updatePosition();
  };

  ngOnChanges(changes: SimpleChange) {
    if(this.disabled){
      this.control.disable();
    }else if(!this.disabled){
      this.control.enable();
    }
  }

  onChangeText(event){
    if(this.disabled) this.text = ' '
    if(event && event.target){
      this.text = event.target.value
    }else{
      this.text = event
    }
    this.onChange.emit(this.text)
  }

  onBlur(event){
    this.blur.emit(event);
  }

  onOpenClose(event: 'open' | 'close'){
    if(event === 'open'){
      this.myInput.nativeElement.classList.add('autocompleteOpen')
      this.utilsComponent.nativeElement.classList.add('slide-top')
    }else {
      this.myInput.nativeElement.classList.remove('autocompleteOpen')
      this.utilsComponent.nativeElement.classList.remove('slide-top')
    }
  }


  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.autocompleteOptions.filter(option => option.toLowerCase().includes(filterValue));
  }


  onVariableSelected(variableSelected: { name: string, value: string }) {
    // this.isSelected = true;
    let valueTextArea = {name: '', value: ''};
    if (this.myInput.nativeElement) {
      this.insertAtCursorPos(this.myInput.nativeElement, '{{' + variableSelected.value + '}}');
      valueTextArea.name = this.myInput.nativeElement.value;
      valueTextArea.value = this.myInput.nativeElement.value;
    }
    if(this.readonly){
      this.myInput.nativeElement.value = '';
      valueTextArea.name = variableSelected.value;
      valueTextArea.value = variableSelected.value;
      this.myInput.nativeElement.placeholder = '';
    } else {
      // this.onChangeTextArea(valueTextArea.name);
    }
    this.addVariable.close();
    this.selectedAttribute.emit(variableSelected);
  }

  openSetAttributePopover() {
    // this.emojiPicker.toggle()
    this.myInput.nativeElement.focus();
    this.onOpenClose('close')
  }

  private insertAtCursorPos(elem: HTMLInputElement, attribute) {
    let cursor_pos = elem.selectionStart;
    var textarea_txt = elem.value;
    var txt_to_add = attribute;
    
    //clear '{' or '{{' cursor_pos -1/-2 chars
    if( textarea_txt.substring(cursor_pos -1, cursor_pos) === '{')  textarea_txt = textarea_txt.substring(0, cursor_pos-1)
    if( textarea_txt.substring(cursor_pos -2, cursor_pos) === '{{')  textarea_txt = textarea_txt.substring(0, cursor_pos-2)

    elem.value = textarea_txt.substring(0, cursor_pos) + txt_to_add + textarea_txt.substring(cursor_pos);
    elem.focus();
    elem.selectionEnd = cursor_pos + txt_to_add.length;
    this.text = elem.value;
  }

}
