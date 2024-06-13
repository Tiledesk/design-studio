import { Component, Input, OnInit } from '@angular/core';
import { ACTIONS_LIST } from 'src/app/chatbot-design-studio/utils-actions';
import { ActionClose } from 'src/app/models/action-model';

@Component({
  selector: 'cds-action-close',
  templateUrl: './cds-action-close.component.html',
  styleUrls: ['./cds-action-close.component.scss']
})
export class CdsActionCloseComponent implements OnInit {

  @Input() action: ActionClose;
  @Input() previewMode: boolean = true;

  actions = ACTIONS_LIST
  
  constructor() { }

  ngOnInit(): void {
  }

}
