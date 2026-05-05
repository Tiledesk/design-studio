import { ACTIONS_LIST } from '../../../../../utils-actions';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActionAgent } from 'src/app/models/action-model';

@Component({
  selector: '  selector: 'cds-action-agent-new',-new',
  templateUrl: './cds-action-agent-handoff-new.component.html',
  styleUrls: ['./cds-action-agent-handoff-new.component.scss']
})
export class CdsActionAgentHandoffNewComponent implements OnInit {

  @Input() action: ActionAgent;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  
  actions = ACTIONS_LIST

  constructor() { }

  ngOnInit(): void {
  }

}
