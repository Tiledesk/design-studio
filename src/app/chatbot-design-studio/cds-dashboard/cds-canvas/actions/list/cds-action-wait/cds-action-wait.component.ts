import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { ActionWait } from 'app/models/intent-model';

@Component({
  selector: 'cds-action-wait',
  templateUrl: './cds-action-wait.component.html',
  styleUrls: ['./cds-action-wait.component.scss']
})
export class CdsActionWaitComponent implements OnInit, OnChanges {

  @Input() action: ActionWait;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  delayTime: number;

  constructor() { }

  ngOnInit(): void {
  }
  
  ngOnChanges() {
    // console.log('[ACTION-WAIT] wait this.actionwait.millis ', this.action.millis)
    const waitInSec = this.action.millis / 1000
    this.delayTime = waitInSec;
  }

  formatLabel(value: number) {
    // console.log('[ACTION-WAIT] formatLabel value ', value)
    return value + 's';
  }

  updateWaitValue(event) {
    // console.log('[ACTION-WAIT] formatLabel updateSetting ', event.value)
    const msvalue = event.value * 1000

    this.action.millis = msvalue
    this.updateAndSaveAction.emit()
    // this.delayTime  = msvalue
    // console.log('[ACTION-WAIT] formatLabel msvalue ', msvalue)
  }
}
