import { Component, Input, OnInit } from '@angular/core';
import { ACTIONS_LIST } from 'src/app/chatbot-design-studio/utils-actions';
import { ActionClose } from 'src/app/models/action-model';

@Component({
  selector: '  selector: 'cds-action-close-new',-new',
  templateUrl: './cds-action-close-new.component.html',
  styleUrls: ['./cds-action-close-new.component.scss']
})
export class CdsActionCloseNewComponent implements OnInit {

  @Input() action: ActionClose;
  @Input() previewMode: boolean = true;

  actions = ACTIONS_LIST
  
  constructor() { }

  ngOnInit(): void {
    // // empty
  }

}
