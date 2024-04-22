import { Component, Input, OnInit, Output, EventEmitter, SimpleChanges, ViewChild, ElementRef, SimpleChange } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'cds-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.scss']
})
export class CDSTextComponent implements OnInit {

  @ViewChild('input_text', {read:ElementRef}) myInput: ElementRef<HTMLInputElement>;
  
  // @Input() textMessage: string;
  @Input() control: FormControl<string> = new FormControl()
  @Input() text: string;
  @Input() placeholder: string;
  @Input() customPrefix: boolean;
  @Input() disabled: boolean = false;
  @Input() autocompleteOptions: string[] = [];
  @Input() inputType: string = "text";
  @Output() blur = new EventEmitter();
  @Output() onChange = new EventEmitter<string>();
  
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
  }


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
    }else{
      this.myInput.nativeElement.classList.remove('autocompleteOpen')
    }
  }


  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.autocompleteOptions.filter(option => option.toLowerCase().includes(filterValue));
  }


  onDeleteResponse(){
    // this.deleteResponse.emit(this.index);
  }

  /** */
  onMoveUpResponse(){
    // this.moveUpResponse.emit(this.index);
  }

  /** */
  onMoveDownResponse(){
    // this.moveDownResponse.emit(this.index);
  }

}
