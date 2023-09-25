import { FormControl } from '@angular/forms';
import { Component, OnInit, ViewChild, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { calculatingRemainingCharacters, TEXT_CHARS_LIMIT, variableList } from 'app/chatbot-design-studio/utils';
import { SatPopover } from '@ncstate/sat-popover';
import { LoggerService } from 'app/services/logger/logger.service';

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
  @Input() control: FormControl<string> = new FormControl();
  @Input() showUtils: boolean = true;
  @Input() emojiPikerBtn: boolean = true;
  @Input() setAttributeBtn: boolean = true;
  @Input() textLimitBtn: boolean = true;
  @Input() minRow: number = 2;
  @Input() maxRow: number = 20;
  @Input() readonly: boolean = false;
  @Input() onevalue: boolean = false;
  @Input() popoverVerticalAlign: string = 'below'

  @Output() changeTextarea = new EventEmitter();
  @Output() selectedAttribute = new EventEmitter();
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
  // strPlaceholder: string;

  public textArea: string = '';
  public isEmojiPickerVisible: boolean = false;
  IS_ON_MOBILE_DEVICE = false;
  emojiPerLine: number = 8;
  emojiColor: string ="#ac8b2c";
  emojiiCategories = [ 'recent', 'people', 'nature', 'activity', 'flags'];

  constructor(
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    //this.initialize();
  }

  ngOnChanges() {
    this.initialize();
  }

  ngAfterViewInit() {
    this.getTextArea();
  }

  initialize(){
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
    console.log('onClickTextareaOpenSetAttributePopover', this.readonly, this.setAttributeBtn);
    if(this.readonly === true  && this.setAttributeBtn == true){
      this.addVariable.toggle();
      this.openSetAttributePopover();
    }
  }

  onChangeTextArea(event) {
    this.logger.log('[CDS-TEXAREA] onChangeTextarea-->', event, this.readonly);
    this.calculatingleftCharsText();
    // console.log('onChangeTextarea!! ',event);
    if(this.readonly && event){
      this.textTag = event;
      this.text = '';
      if(this.elTextarea)this.elTextarea.value = '';
      // console.log("SI::  readonly -- text --", this.text, " -- textTag --", this.textTag);
    } else {
      this.text = event;
      // console.log("NO::  readonly -- text --", this.text, " -- textTag --", this.textTag);
    }
    if(!this.isSelected || !this.readonly){
      this.changeTextarea.emit(event);
    }
  }

  onVariableSelected(variableSelected: { name: string, value: string }) {
    this.isSelected = true;
    console.log('onVariableSelected:: ', this.elTextarea.placeholder);
    let valueTextArea = {name: '', value: ''};
    if (this.elTextarea) {
      this.elTextarea.focus();
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
      this.onChangeTextArea(valueTextArea.name);
    }
    this.addVariable.close();
    this.selectedAttribute.emit(variableSelected);
  }

  onClearSelectedAttribute() {
    console.log('onClearSelectedAttribute:: ', this.elTextarea.placeholder);
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
    elem.value = textarea_txt.substring(0, cursor_pos) + txt_to_add + textarea_txt.substring(cursor_pos);
    elem.focus();
    elem.selectionEnd = cursor_pos + txt_to_add.length;
  }

  onAddEmoji(event){
    if(this.text){
      this.text = `${this.text}${event.emoji.native}`;
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

}