import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import { SatPopover } from '@ncstate/sat-popover';
import { TiledeskVarSplitter } from '../../TiledeskVarSplitter';
import { calculatingRemainingCharacters, TEXT_CHARS_LIMIT } from '../../utils';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';


@Component({
  selector: 'text-editable-div',
  templateUrl: './text-editable-div.component.html',
  styleUrls: ['./text-editable-div.component.scss']
})
export class TextEditableDivComponent implements OnInit, OnChanges {

  @Input() text: string;
  @Output() textChanged = new EventEmitter();
  @Input() emojiPikerBtn: boolean;
  @Input() setAttributeBtn: boolean;
  @Input() textLimitBtn: boolean;
  @Input() textLimit: number = TEXT_CHARS_LIMIT;
  @Input() minHeightContent: number;

  leftCharsText: number;
  alertCharsText: boolean = false;

  isOpenSetAttributesPanel: boolean = false
  public savedSelection: any;

  textVariable: string;
  variableListMock: Array<{ name: string, value: string }> = [
    { name: 'facebook', value: 'facebook' },
    { name: 'email', value: 'email' },
    { name: 'instagram', value: 'instagram' },
    { name: 'variabile1', value: 'valvariabile14' },
    { name: 'userFullName', value: 'userFullName' },
  ]

  intentVariableListMock: Array<{ name: string, value: string }> = [
    { name: 'facebook', value: 'facebook' },
    { name: 'email', value: 'email' },
    { name: 'instagram', value: 'instagram' },
    { name: 'variabile1', value: 'valvariabile14' },
    { name: 'userFullName', value: 'userFullName' },
  ]
  // -----------------------------
  // new 
  // -----------------------------
  cannedResponseMessage: string;
  elTextarea: HTMLInputElement;
  addWhiteSpaceBefore: boolean;
  texareaIsEmpty = false;

  @ViewChild("setattributepopover", { static: false }) setattributepopover: SatPopover;

  logger: LoggerService = LoggerInstance.getInstance()
  constructor(
    private elementRef: ElementRef
  ) { }

  ngOnInit(): void {

    this.calculatingRemainingCharacters();
  }

  // ---------------------------------------------------------
  // new
  // ---------------------------------------------------------
  ngAfterViewInit() {
    this.getTextArea();
  }
  getTextArea() {
    this.elTextarea = this.elementRef.nativeElement.querySelector('.canned-response-texarea') as HTMLInputElement;
    this.logger.log('[CANNED-RES-EDIT-CREATE] - GET TEXT AREA - elTextarea ', this.elTextarea);
  }

  // -------------------------------------
  // @ Open popover
  // -------------------------------------
  openSetattributePopover() {
    // this.logger.log('openSetattributePopover setattributepopover  ', this.setattributepopover)
    this.logger.log('openSetattributePopover setattributepopover is Open ', this.setattributepopover.isOpen())
    this.setattributepopover.open()
    // this.seCursorAtEnd()
    const position = this.elTextarea.selectionStart
    this.logger.log(position)
  }

  onVariableSelected(variable) {
    if (this.elTextarea) {
      this.insertAtCursor(this.elTextarea, '{{' + variable.name + '}}')
      this.setattributepopover.close()
    }
  }

  seCursorAtEnd() {
    this.elTextarea.focus()
    var val = this.elTextarea.value;
    this.logger.log('onVariableSelected val', val)
    this.elTextarea.value = ''; //clear the value of the element
    this.elTextarea.value = val; //set that value back. 
  }



  insertAtCursor(myField, myValue) {
    this.logger.log('[CANNED-RES-EDIT-CREATE] - insertAtCursor - myValue ', myValue);

    if (this.addWhiteSpaceBefore === true) {
      myValue = ' ' + myValue;
      this.logger.log('[CANNED-RES-EDIT-CREATE] - GET TEXT AREA - QUI ENTRO myValue ', myValue);
    }

    //IE support
    if (myField.selection) {
      myField.focus();
      let sel = myField.selection.createRange();
      sel.text = myValue;
      // this.cannedResponseMessage = sel.text;
    }
    //MOZILLA and others
    else if (myField.selectionStart || myField.selectionStart == '0') {
      var startPos = myField.selectionStart;
      this.logger.log('[CANNED-RES-EDIT-CREATE] - insertAtCursor - startPos ', startPos);

      var endPos = myField.selectionEnd;
      this.logger.log('[CANNED-RES-EDIT-CREATE] - insertAtCursor - endPos ', endPos);

      myField.value = myField.value.substring(0, startPos) + myValue + myField.value.substring(endPos, myField.value.length);

      // place cursor at end of text in text input element
      myField.focus();
      var val = myField.value; //store the value of the element
      myField.value = ''; //clear the value of the element
      myField.value = val + ' '; //set that value back. 

      this.cannedResponseMessage = myField.value;

      this.texareaIsEmpty = false;
      // myField.select();
    } else {
      myField.value += myValue;
      this.cannedResponseMessage = myField.value;
    }
  }


  cannedResponseMessageChanged($event) {
    this.logger.log('[CANNED-RES-EDIT-CREATE] - ON MSG CHANGED ', $event);
    if ($event && $event.length > 0) {
      this.texareaIsEmpty = false;
    } else {
      // this.texareaIsEmpty = true;
    }

    if (/\s$/.test($event)) {

      this.logger.log('[CANNED-RES-EDIT-CREATE] - ON MSG CHANGED - string contains space at last');
      this.addWhiteSpaceBefore = false;
    } else {

      this.logger.log('[CANNED-RES-EDIT-CREATE] - ON MSG CHANGED - string does not contain space at last');

      // IS USED TO ADD A WHITE SPACE TO THE 'PERSONALIZATION' VALUE IF THE STRING DOES NOT CONTAIN SPACE AT LAST
      this.addWhiteSpaceBefore = true;
    }

  }




  // ---------------------------------------------------------
  // ./new
  // ---------------------------------------------------------

  private calculatingRemainingCharacters() {
    if (this.textLimitBtn) {
      this.leftCharsText = calculatingRemainingCharacters(this.text, this.textLimit);
      this.logger.log('this.leftCharsText::: ', this.textLimit, this.leftCharsText, (this.textLimit / 10));
      if (this.leftCharsText < (this.textLimit / 10)) {
        this.alertCharsText = true;
      } else {
        this.alertCharsText = false;
      }
    }
  }

  ngOnChanges() {
    this.logger.log("[TEXT-EDITABLE-DIV] ngOnChanges: text", this.text);
    // imputEle.focus(imputEle);
    // let fommattedActionSubject = this.splitText(this.text);
    // let imputEle = this.elementRef.nativeElement.querySelector('#content-editable');
    // imputEle.innerHTML = fommattedActionSubject;
    // this.placeCaretAtEnd(imputEle);
    // setTimeout(() => {
    //   this.saveSelection(imputEle, 0, 'ngOnChanges')
    // }, 500);

  }


  private splitText(text) {
    const splits = new TiledeskVarSplitter().getSplits(text);
    this.logger.log('[TEXT-EDITABLE-DIV] ngOnChanges splits:', splits)
    let tagName = ''
    let tagNameAsTag = ''
    let newSplitsArray = [];
    let fommattedActionSubject = ''
    splits.forEach(element => {
      if (element.type === 'tag') {
        tagName = '{{' + element.name + '}}';
        tagNameAsTag = `<div tag="true" contenteditable="false"  style=" font-weight: 400;font-family: var(--font-family-poppins); background: #ffdc66;cursor: pointer;-webkit-transition: all 0.3s;  transition: all 0.3s; border-radius: 10px;-webkit-box-decoration-break: clone; box-decoration-break: clone; display: inline; padding: 0 5px;">${tagName}</div>`
        newSplitsArray.push(tagNameAsTag)
      } else if (element.type === 'text') {
        newSplitsArray.push(element.text)
      }
    });
    this.logger.log('[TEXT-EDITABLE-DIV]  fommattedActionSubject', fommattedActionSubject);
    this.logger.log('[TEXT-EDITABLE-DIV]  newSplitsArray', newSplitsArray);
    newSplitsArray.forEach(element => {
      fommattedActionSubject += element
    });
    return fommattedActionSubject;
  }




  placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
      var range = document.createRange();
      this.logger.log('placeCaretAtEnd range ', range)
      range.selectNodeContents(el);

      range.collapse(false);
      var sel = window.getSelection();
      this.logger.log('placeCaretAtEnd sel ', sel)
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      this.logger.log('placeCaretAtEnd else ')
    }

  }




  _onVariableSelected(variable) {
    this.logger.log("[TEXT-EDITABLE-DIV] selectedAttibute attribute: ", variable);
    let attribute = '{{' + variable.value + '}}'

    this.logger.log('[TEXT-EDITABLE-DIV] selectedAttibute attribute - attribute length : ', attribute.length)
    // const imputEle = document.querySelector('#email-subject') as HTMLElement
    const imputEle = this.elementRef.nativeElement.querySelector('#content-editable')
    this.logger.log("[TEXT-EDITABLE-DIV] selectedAttibute imputEle: ", imputEle);
    this.setattributepopover.close()
    // setTimeout(() => {
    //   if (this.savedSelection) { 
    //     this.restoreSelection(imputEle, this.savedSelection)

    //   } else {
    //     this.placeCaretAtEnd(imputEle);
    //   }
    // }, 400);



    imputEle.focus();
    // this.placeCaretAtEnd(imputEle);
    // this.setCaret(imputEle);

    // let savedRange = this.savedSelection.getRangeAt(0)
    // this.logger.log('savedRange: ', savedRange) 

    // let clonedRange = savedRange.cloneRange()
    // this.logger.log('clonedRange: ', clonedRange) 

    if (this.savedSelection) {
      this.restoreSelection(imputEle, this.savedSelection)
    } else {
      this.placeCaretAtEnd(imputEle);
    }
    const timestamp = new Date().getTime()
    this.logger.log('timestamp', timestamp)
    this.setAttributeAtCaret(`<div tag="true" id="${timestamp}" contenteditable="false" style="font-weight: 400;font-family: var(--font-family-poppins); background: #ffdc66; cursor: pointer;-webkit-transition: all 0.3s;  transition: all 0.3s; border-radius: 10px;-webkit-box-decoration-break: clone; box-decoration-break: clone; display: inline; padding: 0 5px;">${attribute}</div>`)
    // this.isOpenSetAttributesPanel = false;

    // this.savedSelection = this.saveSelection(imputEle, attribute.length, 'onVariableSelected')
    // let range = document.createRange()
    // window.getSelection()
    // range.setStart(childNode, length)

    this.logger.log("[TEXT-EDITABLE-DIV] onVariableSelected savedSelection before to restore: ", this.savedSelection);

    this.setCaret(imputEle)
    // this.setCaret(imputEle, timestamp, attribute.length)

    // if (this.savedSelection) {
    //   // setTimeout(() => {
    //     // this.setCaret(imputEle, timestamp, attribute.length)
    //     this.restoreSelection(imputEle, this.savedSelection)
    //   // }, 500);
    // }

    // if (this.savedSelection) {
    //   this.restoreSelection(imputEle, this.savedSelection)
    // } else {
    //   this.placeCaretAtEnd(imputEle);
    // }

    // this.onInput('controller')
  }

  // setAttribute(attribute) {
  //   this.logger.log("[TEXT-EDITABLE-DIV] selectedAttibute attribute: ", attribute);
  //   // const imputEle = document.querySelector('#email-subject') as HTMLElement
  //   const imputEle = this.elementRef.nativeElement.querySelector('#content-editable')
  //   this.logger.log("[TEXT-EDITABLE-DIV] selectedAttibute imputEle: ", imputEle);
  //   imputEle.focus();
  //   this.setAttributeAtCaret(`<div contenteditable="false" style="font-weight: 400;font-family: var(--font-family-poppins); background: #ffdc66;cursor: pointer;-webkit-transition: all 0.3s;  transition: all 0.3s; border-radius: 10px;-webkit-box-decoration-break: clone; box-decoration-break: clone; display: inline; padding: 0 5px;">${attribute}</div>`)
  //   this.isOpenSetAttributesPanel = false;
  //   // this.onInput()
  // }

  onAddCustomAttribute() { }

  onChangeSearch($event) { }
  // background: #ffdc66;


  _setCaret(imputEle, timestamp, length) {
    // var el = document.getElementById("editable")
    this.logger.log('setCaret length ', length)
    let el = imputEle
    let range = document.createRange()
    let sel = window.getSelection()


    // this.logger.log('setCaret  el.childNodes[2]', el.childNodes[2])
    this.logger.log('setCaret  el.childNodes', el.childNodes)

    el.childNodes.forEach((childNode, index) => {
      this.logger.log('childNode', childNode, 'index', index)
      this.logger.log('childNode id', childNode.id, 'String(timestamp)', String(timestamp))
      if (childNode.id === String(timestamp)) {
        this.logger.log('---- >>>>> childNode', childNode, 'index ', index)

        // range.setStart(el.childNodes[index], length)
        // setTimeout(() => {
        range.setStart(childNode, 1)
        // }, 500);
        // this.saveSelection(imputEle, 0, 'setCaret') 
      }
    });


    range.collapse(true)

    sel.removeAllRanges()
    sel.addRange(range)
    // el.focus();
  }


  setCaret(imputEle) {
    var el = imputEle
    var range = document.createRange()
    var sel = window.getSelection()

    range.setStart(el.childNodes[2], 5)
    range.collapse(true)

    sel.removeAllRanges()
    sel.addRange(range)
  }


  setAttributeAtCaret(html: any) {
    var sel, range;
    if (window.getSelection) {
      // IE9 and non-IE
      sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
        range = sel.getRangeAt(0);
        range.deleteContents();

        // Range.createContextualFragment() would be useful here but is
        // only relatively recently standardized and is not supported in
        // some browsers (IE9, for one)
        var el = document.createElement("div");
        el.innerHTML = html;
        var frag = document.createDocumentFragment(), node, lastNode;
        while ((node = el.firstChild)) {
          lastNode = frag.appendChild(node);
        }
        // var firstNode = frag.firstChild;
        range.insertNode(frag);

        // Preserve the selection
        if (lastNode) {
          range = range.cloneRange();
          range.setStartAfter(lastNode);
          range.collapse(true);
          // if (selectPastedContent) {
          //     range.setStartBefore(firstNode);
          // } else {
          //     range.collapse(true);
          // }
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }
  }

  // 
  onInput(calledBy) {
    this.logger.log('[TEXT-EDITABLE-DIV] onInput calledBy ', calledBy);
    let imputEle = this.elementRef.nativeElement.querySelector('#content-editable') //document.querySelector('[contenteditable]'),  //document.querySelector('[contenteditable]'),
    // text = contenteditable.textContent;


    // for (let i = 0; i < text.length; i++) {
    //   let code = text.charCodeAt(i);
    //   this.logger.log('text --->>> ', code)
    // }

    // this.logger.log('[TEXT-EDITABLE-DIV] contenteditable innerHtml', contenteditable.innerHTML)

    // this.logger.log('[TEXT-EDITABLE-DIV] onInput text ', text)
    // // this.text = text;
    // this.textChanged.emit(text)

    if (this.textLimitBtn && imputEle.textContent.length > this.textLimit) {
      imputEle.textContent = imputEle.textContent.substring(0, this.textLimit);
      let fommattedActionSubject = this.splitText(imputEle.textContent);
      imputEle.innerHTML = fommattedActionSubject;
      this.placeCaretAtEnd(imputEle);
    }
    this.calculatingRemainingCharacters();
    // this.text = imputEle.textContent;
    this.logger.log('[TEXT-EDITABLE-DIV] onInputActionSubject text ', this.text);
    this.textChanged.emit(this.text);

    if (calledBy === 'template') {
      this.savedSelection = this.saveSelection(imputEle, 2, 'onInput');
      this.logger.log('[TEXT-EDITABLE-DIV] savedSelection onInput ', this.savedSelection)
    }

  }


  saveSelection(imputEle, increment: number, calledBy) {
    this.logger.log('saveSelection imputEle', calledBy)
    this.logger.log('saveSelection increment', increment)
    if (window.getSelection && document.createRange) {
      // saveSelection =  (imputEle) => {
      this.logger.log('saveSelection imputEle', imputEle)
      var range = window.getSelection().getRangeAt(0);
      var preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(imputEle);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      var start = preSelectionRange.toString().length + 'increment';
      this.logger.log('saveSelection start', start)
      this.logger.log('saveSelection end', start + range.toString().length)
      return {

        start: start,
        end: start + range.toString().length
      }
    }
  }

  restoreSelection(containerEl, savedSel) {
    if (window.getSelection && document.createRange) {
      var charIndex = 0, range = document.createRange();
      range.setStart(containerEl, 0);
      range.collapse(true);
      var nodeStack = [containerEl], node, foundStart = false, stop = false;

      while (!stop && (node = nodeStack.pop())) {
        if (node.nodeType == 3) {
          var nextCharIndex = charIndex + node.length;
          if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
            range.setStart(node, savedSel.start - charIndex);
            foundStart = true;
          }
          if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
            range.setEnd(node, savedSel.end - charIndex);
            stop = true;
          }
          charIndex = nextCharIndex;
        } else {
          var i = node.childNodes.length;
          while (i--) {
            nodeStack.push(node.childNodes[i]);
          }
        }
      }

      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  mouseUp() {
    this.logger.log("[ACTION-EMAIL] mouseUp: ");
    let imputEle = this.elementRef.nativeElement.querySelector('#content-editable')

    this.savedSelection = this.saveSelection(imputEle, 2, 'mouseUp');
    this.logger.log('savedSelection ', this.savedSelection)
  }



  toggleSetAttributesPanel(isopen) {
    this.logger.log("[TEXT-EDITABLE-DIV] toggleSetAttributesPanel - isopen Attributes Panel: ", isopen);
    this.isOpenSetAttributesPanel = isopen
  }

  onBlur() {
    this.logger.log("[TEXT-EDITABLE-DIV] onBlur isOpenSetAttributesPanel ", this.isOpenSetAttributesPanel);
    // if (this.isOpenSetAttributesPanel === true) {
    //   this.isOpenSetAttributesPanel = false;
    // }
  }



}
