import { FormControl } from '@angular/forms';
import { Component, OnInit, ViewChild, Input, Output, EventEmitter, ElementRef, HostListener, SimpleChanges, SimpleChange } from '@angular/core';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { calculatingRemainingCharacters, TEXT_CHARS_LIMIT } from '../../../../utils';
import { SatPopover } from '@ncstate/sat-popover';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-textarea',
  templateUrl: './textarea.component.html',
  styleUrls: ['./textarea.component.scss']
})
export class CDSTextareaComponent implements OnInit {

  @ViewChild('autosize') autosize: CdkTextareaAutosize;
  @ViewChild("addVariable") addVariable: SatPopover;
  @ViewChild("emojiPicker") emojiPicker: SatPopover;

  @Input() placeholder: string = '';
  @Input() text: string = '';
  @Input() limitCharsText: number = TEXT_CHARS_LIMIT;
  // @Input() textMessage: string;
  @Input() control: FormControl<string> = new FormControl('');
  @Input() showUtils: boolean = true;
  @Input() emojiPikerBtn: boolean = true;
  @Input() setAttributeBtn: boolean = true;
  @Input() textLimitBtn: boolean = true;
  @Input() minRow: number = 2;
  @Input() maxRow: number = 20;
  @Input() readonly: boolean = false;
  @Input() autoResize: boolean = false;
  @Input() popoverVerticalAlign: string = 'below'

  @Output() changeTextarea = new EventEmitter();
  @Output() selectedAttribute = new EventEmitter();
  @Output() blur = new EventEmitter();
  @Output() selectedEmoji = new EventEmitter();
  @Output() clearSelectedAttribute = new EventEmitter();

  // Textarea //
  leftCharsText: number;
  alertCharsText: boolean;
  elTextarea: HTMLInputElement;
  addWhiteSpaceBefore: boolean;
  cannedResponseMessage: string;
  texareaIsEmpty = false;
  textTag: string = '';
  isSelected: boolean = false;
  textIsChanged: boolean = false;
  startText: string;
  // strPlaceholder: string;

  // Wrapper management // 
  expand: boolean = false

  public textArea: string = '';
  public isEmojiPickerVisible: boolean = false;
  IS_ON_MOBILE_DEVICE = false;
  emojiPerLine: number = 8;
  emojiColor: string ="#506493";
  emojiiCategories = [ 'recent', 'people', 'nature', 'activity', 'flags'];

  private logger: LoggerService = LoggerInstance.getInstance()
  
  constructor() { }

  ngOnInit(): void {
    this.initialize();
  }

  ngOnChanges(changes: SimpleChange) {
    // if(changes && changes['readonly'] && changes['readonly'].previousValue !== changes['readonly'].currentValue){
    //   this.textTag = this.text
    // }
    if(this.readonly){
      this.control.disable();
    }else if(!this.readonly){
      this.control.enable();
    }
    // this.initialize();
    
  }

  ngAfterViewInit() {
    this.getTextArea();
  }

  initialize(){
    this.startText = this.text;
    this.textIsChanged = false;
    if (this.text) {
      this.control.patchValue(this.text);
    } else {
      this.text = this.control.value;
    }
    this.calculatingleftCharsText();
  }

  private calculatingleftCharsText(){
    this.leftCharsText = calculatingRemainingCharacters(this.text, this.limitCharsText);
    if (this.leftCharsText < (this.limitCharsText / 10)) {
      this.alertCharsText = true;
    } else {
      this.alertCharsText = false;
    }
  }


  /** */
  onClickTextareaOpenSetAttributePopover(){
    this.logger.log('onClickTextareaOpenSetAttributePopover', this.readonly, this.setAttributeBtn);
    if(this.readonly === true  && this.setAttributeBtn == true){
      this.addVariable.toggle();
      this.openSetAttributePopover();
    }
  }

  onChangeTextArea(event) {
    // this.logger.log('[CDS-TEXAREA] onChangeTextarea-->', event, this.readonly);
    this.calculatingleftCharsText();
    if(this.readonly && event){
      this.textTag = event;
      this.text = '';
      if(this.elTextarea)this.elTextarea.value = '';
    } else {
      if(this.startText !== event){
        this.textIsChanged = true;
        this.text = event;
        // this.logger.log('[CDS-TEXAREA] onChangeTextarea-->', this.text, this.textIsChanged);
      }
    }
    if(!this.isSelected || !this.readonly){
      this.changeTextarea.emit(event.toString().trim());
    }
  }

  onBlur(event){
    if(this.autoResize) this.maxRow = 1;
    this.logger.log('[CDS-TEXAREA] - onBlur - isOpen textIsChanged', this.textIsChanged, this.addVariable.isOpen());
    if(!this.addVariable.isOpen() && !this.emojiPicker.isOpen() && this.textIsChanged){
      this.textIsChanged = false;
      this.startText = this.text;
      this.blur.emit(event);
    }
  }

  onFocus(event){
    this.logger.log('[CDS-TEXAREA] - onFocus - isOpen textIsChanged');
    if(this.autoResize) this.maxRow = 5
  }

  onVariableSelected(variableSelected: { name: string, value: string }) {
    this.isSelected = true;
    let valueTextArea = {name: '', value: ''};
    if (this.elTextarea) {
      this.insertAtCursorPos(this.elTextarea, '{{' + variableSelected.value + '}}');
      valueTextArea.name = this.elTextarea.value;
      valueTextArea.value = this.elTextarea.value;
    }
    if(this.readonly){
      this.elTextarea.value = '';
      valueTextArea.name = variableSelected.value;
      valueTextArea.value = variableSelected.value;
      this.elTextarea.placeholder = '';
    } else {
      // this.onChangeTextArea(valueTextArea.name);
    }
    this.addVariable.close();
    this.selectedAttribute.emit(variableSelected);
  }

  onClearSelectedAttribute() {
    this.textTag = '';
    this.isSelected = false;
    this.elTextarea.placeholder = this.placeholder;
    this.clearSelectedAttribute.emit({name: '', value: ''});
  }

  openSetAttributePopover() {
    // this.emojiPicker.toggle()
    this.elTextarea = this.autosize['_textareaElement'] as HTMLInputElement;
    this.elTextarea.focus()
  }

  private getTextArea() {
    this.elTextarea = this.autosize['_textareaElement'] as HTMLInputElement;
    this.logger.log('[CDS-TEXAREA] - GET TEXT AREA - elTextarea ', this.elTextarea);
    if (this.elTextarea) {}
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

  onAddEmoji(event){
    if(this.text){
      // this.text = `${this.text} ${event.emoji.native}`;
      this.insertAtCursorPos(this.elTextarea, event.emoji.native);
    } else {
      this.text = `${event.emoji.native}`;
    }
    this.emojiPicker.close();
    this.selectedEmoji.emit(event)
  }
  

  @HostListener('document:keydown', ['$event'])
  onKeyPress(event) {
    const keyCode = event.which || event.keyCode;
    if (keyCode === 27) { // Esc keyboard code
      this.addVariable.close();
    }
  }

  openAttributesList(event) {
    // const keyCode = event.which || event.keyCode;
    // const key = event.key;
    // if (keyCode === 219 && key === "{") { // '{' keyboard code
    //   this.addVariable.toggle();;
    // }
  }

}