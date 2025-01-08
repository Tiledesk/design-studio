import { Component, Input, OnInit } from '@angular/core';
import { ACTIONS_LIST } from 'src/app/chatbot-design-studio/utils-actions';
import { ActionClearTranscript } from 'src/app/models/action-model';

@Component({
  selector: 'cds-action-clear-transcript',
  templateUrl: './cds-action-clear-transcript.component.html',
  styleUrls: ['./cds-action-clear-transcript.component.scss']
})
export class CdsActionClearTranscriptComponent implements OnInit {

  @Input() action: ActionClearTranscript;
  @Input() previewMode: boolean = true;

  actions = ACTIONS_LIST
  
  constructor() { }

  ngOnInit(): void {
  }

}
