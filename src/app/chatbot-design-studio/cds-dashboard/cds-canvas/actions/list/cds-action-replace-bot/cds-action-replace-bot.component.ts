import { Chatbot } from 'app/models/faq_kb-model';
import { ActionReplaceBot } from 'app/models/intent-model';
import { FaqKbService } from 'app/services/faq-kb.service';
import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { LoggerService } from 'app/services/logger/logger.service';

@Component({
  selector: 'cds-action-replace-bot',
  templateUrl: './cds-action-replace-bot.component.html',
  styleUrls: ['./cds-action-replace-bot.component.scss']
})
export class CdsActionReplaceBotComponent implements OnInit, OnChanges {

  @Input() action: ActionReplaceBot;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();

  //bots: Chatbot[] = [];
  chatbots_name_list: Array<{name: string, value: string, icon?:string}>;
  bot_selected: Chatbot;
  
  constructor(
    private chatbotService: FaqKbService,
    private logger: LoggerService,
    ) { }

  ngOnInit(): void {
    this.logger.log("[ACTION REPLACE BOT] action (on-init): ", this.action)
    this.getAllBots();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.logger.log("[ACTION REPLACE BOT] action (on-changes): ", this.action)
  }

  getAllBots() {
    // this.chatbotService.getAllBotByProjectId().subscribe((chatbots) => {
    this.chatbotService.getFaqKbByProjectId().subscribe((chatbots) => {
      this.logger.log("[ACTION REPLACE BOT] chatbots: ", chatbots);
      //this.bots = bots;
      this.chatbots_name_list = chatbots.map(a => ({ name: a.name, value: a.name, icon: 'smart_toy'}));
    }, (error) => {
      this.logger.error("[ACTION REPLACE BOT] error get bots: ", error);
    }, () => {
      this.logger.log("[ACTION REPLACE BOT] get all chatbots completed.");
    })
  }

  onChangeSelect(event: {name: string, value: string}) {
    //this.logger.log("[ACTION REPLACE BOT] onChangeActionButton event: ", event)
    this.action.botName = event.value;
    this.updateAndSaveAction.emit()
    this.logger.log("[ACTION REPLACE BOT] action edited: ", this.action)
  }

}
