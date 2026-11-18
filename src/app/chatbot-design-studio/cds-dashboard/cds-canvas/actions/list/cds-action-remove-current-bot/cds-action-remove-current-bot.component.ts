import { Component, Input } from '@angular/core';
import { ACTIONS_LIST } from 'src/app/chatbot-design-studio/utils-actions';
import { ActionRemoveCurrentBot } from 'src/app/models/action-model';

@Component({
  selector: 'cds-action-remove-current-bot',
  templateUrl: './cds-action-remove-current-bot.component.html',
  styleUrls: ['./cds-action-remove-current-bot.component.scss']
})
export class CdsActionRemoveCurrentBotComponent {

  @Input() action: ActionRemoveCurrentBot;
  @Input() previewMode: boolean = true;

  actions = ACTIONS_LIST;

}
