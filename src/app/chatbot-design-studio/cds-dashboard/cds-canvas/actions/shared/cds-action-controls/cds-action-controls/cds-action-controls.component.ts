import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'cds-action-controls',
  templateUrl: './cds-action-controls.component.html',
  styleUrls: ['./cds-action-controls.component.scss']
})
export class CdsActionControlsComponent implements OnInit {
  
  @Output() onClickControl = new EventEmitter<'delete' | 'edit'>()
  
  constructor() { }

  ngOnInit(): void {
  }

  onClickAction(actionControl: 'delete' | 'edit', event: Event){
    event.stopPropagation();
    this.onClickControl.emit(actionControl)
  }

}
