import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import { ActionWait } from 'src/app/models/action-model';

@Component({
  selector: 'cds-action-wait',
  templateUrl: './cds-action-wait.component.html',
  styleUrls: ['./cds-action-wait.component.scss']
})
export class CdsActionWaitComponent implements OnInit, OnChanges {

  @ViewChild('input_text') inputEl: ElementRef;
  
  @Input() action: ActionWait;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  delayTime: number;

  constructor() { }

  ngOnInit(): void {
  }
  
  ngOnChanges() {
    const waitInSec = this.action.millis / 1000
    this.delayTime = waitInSec;
  }

  formatLabel(value: number) {
    return value + 's';
  }

  updateWaitValue(event) {
    const msvalue = event.value * 1000

    this.action.millis = msvalue
    this.updateAndSaveAction.emit()
    // this.delayTime  = msvalue
  }

  onFocusInput(){
    setTimeout(() => {
      this.inputEl.nativeElement.focus();
    }, 500);
  }

  onFocusOut(){
    this.updateAndSaveAction.emit()
  }

  onChangeText(event){
    const msvalue = event * 1000
    this.action.millis = msvalue    
  }



}
