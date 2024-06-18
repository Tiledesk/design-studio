import { ACTIONS_LIST } from '../../../../../utils-actions';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActionAgent } from 'src/app/models/action-model';

@Component({
  selector: 'cds-action-agent',
  templateUrl: './cds-action-agent-handoff.component.html',
  styleUrls: ['./cds-action-agent-handoff.component.scss']
})
export class CdsActionAgentHandoffComponent implements OnInit {

  @Input() action: ActionAgent;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  
  actions = ACTIONS_LIST

  constructor() { }

  ngOnInit(): void {
  }

}
