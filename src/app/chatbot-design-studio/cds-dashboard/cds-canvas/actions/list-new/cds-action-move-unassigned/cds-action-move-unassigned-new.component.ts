import { Component, Input, OnInit } from '@angular/core';
import { ACTIONS_LIST } from 'src/app/chatbot-design-studio/utils-actions';
import { ActionMoveToUnassigned } from 'src/app/models/action-model';

@Component({
  selector: 'cds-action-move-unassigned-new',
  templateUrl: './cds-action-move-unassigned-new.component.html',
  styleUrls: ['./cds-action-move-unassigned-new.component.scss']
})
export class CdsActionMoveUnassignedNewComponent implements OnInit {

  @Input() action: ActionMoveToUnassigned;
  @Input() previewMode: boolean = true;

  actions = ACTIONS_LIST
  
  constructor() { }

  ngOnInit(): void {
  }

}
