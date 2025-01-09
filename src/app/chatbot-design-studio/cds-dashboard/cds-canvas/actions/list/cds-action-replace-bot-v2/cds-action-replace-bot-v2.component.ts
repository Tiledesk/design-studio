import { Chatbot } from 'src/app/models/faq_kb-model';
import { ActionReplaceBotV2 } from 'src/app/models/action-model';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { FaqService } from 'src/app/services/faq.service';
import { Faq } from 'src/app/models/faq-model';
import { Intent } from 'src/app/models/intent-model';
import { MatCheckbox } from '@angular/material/checkbox';

@Component({
  selector: 'cds-action-replace-bot-v2',
  templateUrl: './cds-action-replace-bot-v2.component.html',
  styleUrls: ['./cds-action-replace-bot-v2.component.scss']
})
export class CdsActionReplaceBotV2Component implements OnInit, OnChanges {

  @Input() action: ActionReplaceBotV2;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();

  //bots: Chatbot[] = [];
  chatbots_name_list: Array<{name: string, value: string, id: string, slug: string, disabled: boolean, icon?:string}>;
  chatbots_block_name_list: Array<{name: string, value: string, icon?:string}>;
  bot_selected: {name: string, value: string, id: string, slug: string, disabled: boolean, icon?:string}

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private chatbotService: FaqKbService,
    private faqService: FaqService
  ) { }

  ngOnInit(): void {
    this.logger.log("[ACTION REPLACE BOT] action (on-init): ", this.action)
    this.initialize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.logger.log("[ACTION REPLACE BOT] action (on-changes): ", this.action)
  }

  async initialize(){
    await this.getAllBots();
    if(this.action && this.action.botName){
      if(this.action.nameAsSlug){
        this.bot_selected = this.chatbots_name_list.find(el => el.slug === this.action.botName)
      }
      if(!this.action.nameAsSlug){
        this.bot_selected = this.chatbots_name_list.find(el => el.name === this.action.botName)
      }
      if(this.bot_selected){
        this.getAllFaqById(this.bot_selected.id)
      }
    }
  }

  async getAllBots() {
    // this.chatbotService.getAllBotByProjectId().subscribe((chatbots) => {
    return new Promise((resolve, reject) => {
      this.chatbotService.getFaqKbByProjectId().subscribe({ next: (chatbots) => {
        this.logger.log("[ACTION REPLACE BOT] chatbots: ", chatbots);
        //this.bots = bots;
        this.chatbots_name_list = chatbots.map(a => ({ name: a.name, value: a.name, slug: a.slug, id: a._id, disabled: this.action.nameAsSlug? !a.slug: false, icon: 'smart_toy'}));
        resolve(true)
      }, error: (error) => {
        this.logger.error("[ACTION REPLACE BOT] error get bots: ", error);
        reject(error)
      }, complete: () => {
        this.logger.log("[ACTION REPLACE BOT] get all chatbots completed.");
      }})
    })
   
  }


  getAllFaqById(chatbotId: string){
    this.logger.log("[ACTION REPLACE BOT] get AllFaqById: ",chatbotId);
    this.faqService.getAllFaqByFaqKbId(chatbotId).subscribe({ next: (faks: Intent[])=> {
      this.chatbots_block_name_list = faks.map((el => ({name: el.intent_display_name, value: el.intent_display_name})))
      this.logger.log("[ACTION REPLACE BOT] get AllFaqById: ", this.chatbots_block_name_list);
    }, error: (error)=> {
      this.logger.error("[ACTION REPLACE BOT] error get AllFaqById: ", error);
    }, complete: () => {
      this.logger.log("[ACTION REPLACE BOT] get AllFaqById completed.");
    }})
  }

  onChangeSelect(event: {name: string, value: string, slug: string, id: string}) {
    this.logger.log("[ACTION REPLACE BOT] onChangeActionButton event: ", event)
    this.bot_selected = this.chatbots_name_list.find(el => el.id === event.id)
    console.log('bottttttt', this.bot_selected)
    if(this.action.nameAsSlug){
      this.action.botName = event.slug;
    }
    this.action.botName = event.value;
    this.getAllFaqById(event.id)
    this.updateAndSaveAction.emit()
    this.logger.log("[ACTION REPLACE BOT] action edited: ", this.action)
  }

  onChangeBlockSelect(event: {name: string, value: string}){
    this.action.blockName = event.value;
    this.updateAndSaveAction.emit()
    this.logger.log("[ACTION REPLACE BOT] action selet block to execute: ", this.action)
  }

  onResetSelect(event, key: string){
    switch(key){
      case 'botName':
        this.action.botName = null;
        this.bot_selected = null;
        break;
      case 'blockName':
        this.action.blockName = null
        break;   
    }
    this.updateAndSaveAction.emit()
  }

  onChangeCheckbox(event: MatCheckbox, target){
    this.action[target] = !this.action[target];
    this.chatbots_name_list = this.chatbots_name_list.map(a => ({ name: a.name, value: a.name, slug: a.slug, id: a.id, disabled: this.action.nameAsSlug? !a.slug: false, icon: 'smart_toy'}));
    if(event.checked && this.action.botName){
      this.action.botName = this.getChatbotByNameOrSlug().slug
    }
    this.updateAndSaveAction.emit()
  }


  getChatbotByNameOrSlug(){
    if(this.chatbots_name_list){
      let chatbotByName = this.chatbots_name_list.find(el => el.name === this.action.botName)
      if(chatbotByName){
        this.bot_selected = chatbotByName
        return chatbotByName
      }
      let chatbotBySlug = this.chatbots_name_list.find(el => el.slug === this.action.botName)
      if(chatbotBySlug){
        this.bot_selected = chatbotBySlug
        return chatbotBySlug
      }
    }
  }




}
