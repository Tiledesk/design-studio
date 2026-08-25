import { Component, Input, OnInit } from '@angular/core';
import { ACTIONS_LIST } from 'src/app/chatbot-design-studio/utils-actions';
import { ActionReturnStack } from 'src/app/models/action-model';

@Component({
  selector: 'cds-action-return-stack',
  templateUrl: './cds-action-return-stack.component.html',
  styleUrls: ['./cds-action-return-stack.component.scss']
})
export class CdsActionReturnStackComponent implements OnInit {

  @Input() action: ActionReturnStack;
  @Input() previewMode: boolean = true;

  actions = ACTIONS_LIST
  
  constructor() { }

  ngOnInit(): void {
    // empty
  }

}
