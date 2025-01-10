import { Chatbot } from 'src/app/models/faq_kb-model';
import { ActionReplaceBotV3 } from 'src/app/models/action-model';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { FaqService } from 'src/app/services/faq.service';
import { Faq } from 'src/app/models/faq-model';
import { Intent } from 'src/app/models/intent-model';
import { MatCheckbox } from '@angular/material/checkbox';

@Component({
  selector: 'cds-action-replace-bot-v3',
  templateUrl: './cds-action-replace-bot-v3.component.html',
  styleUrls: ['./cds-action-replace-bot-v3.component.scss']
})
export class CdsActionReplaceBotV3Component implements OnInit, OnChanges {

  @Input() action: ActionReplaceBotV3;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();

  //bots: Chatbot[] = [];
  chatbots_name_list: Array<{name: string, value: string, id: string, slug: string, icon?:string}>;
  chatbots_block_name_list: Array<{name: string, value: string, icon?:string}>;
  bot_selected: Chatbot;

  autocompleteOptions: Array<string> = [];

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
    if(this.action && this.action.botId){
      let selectedChatbot = this.chatbots_name_list.find(el => el.id === this.action.botId)
      if(selectedChatbot){
        this.getAllFaqById(selectedChatbot.id)
      }
    }
  }

  async getAllBots() {
    // this.chatbotService.getAllBotByProjectId().subscribe((chatbots) => {
    return new Promise((resolve, reject) => {
      this.chatbotService.getFaqKbByProjectId().subscribe({ next: (chatbots) => {
        this.logger.log("[ACTION REPLACE BOT] chatbots: ", chatbots);
        //this.bots = bots;
        this.chatbots_name_list = chatbots.map(a => ({ name: a.name, value: a.name, slug: a.slug, id: a._id, disabled: this.action.useSlug? !a.slug: false, icon: 'smart_toy'}));
        chatbots.forEach(el => {
          if(el.slug)
            this.autocompleteOptions.push(el.name + ' (' + el.slug + ')')
        })
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
    this.action.botId = event.id;
    this.action.botSlug = event.slug;
    this.getAllFaqById(event.id)
    this.updateAndSaveAction.emit()
    this.logger.log("[ACTION REPLACE BOT] action edited: ", this.action)
  }

  onChangeTextarea($event: string, property: string) {
    this.logger.log("[ACTION-ASKGPT] onEditableDivTextChange event", $event)
    this.logger.log("[ACTION-ASKGPT] onEditableDivTextChange property", property)
    this.action.botSlug = $event
    this.action.botId = this.chatbots_name_list.find(el => el.slug === $event)?.id ?? null;
    // this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onBlur(event){
    this.updateAndSaveAction.emit();
  }

  onAutocompleteOptionSelected(option: string, property: string){
    let name = option.split('(')[0].trim()
    let slug = option.split('(')[1].trim().slice(0, -1);
    this.action.botId = this.chatbots_name_list.find(el => (el.name === name && el.slug === slug)).id
    this.action.botSlug = this.chatbots_name_list.find(el => el.id === this.action.botId).slug
  }

  onChangeBlockSelect(event: {name: string, value: string}){
    this.action.blockName = event.value;
    this.updateAndSaveAction.emit()
    this.logger.log("[ACTION REPLACE BOT] action selet block to execute: ", this.action)
  }

  onResetSelect(event, key: string){
    switch(key){
      case 'botId':
        this.action.botId = null;
        break;
      case 'blockName':
        this.action.blockName = null
        break;   
    }
    this.updateAndSaveAction.emit()
  }

  onChangeCheckbox(event: MatCheckbox, target){
    this.action[target] = !this.action[target];
    this.chatbots_name_list = this.chatbots_name_list.map(a => ({ name: a.name, value: a.name, slug: a.slug, id: a.id, disabled: this.action.useSlug? !a.slug: false, icon: 'smart_toy'}));
    if (target === "useSlg") {
      if (this.action[target]) {
        if (this.action.botId) {
          this.action.botSlug = this.getChatbotByIdOrSlug().slug
        }
      } else {
        this.action.botId = this.getChatbotByIdOrSlug().value
      }
    }
    this.updateAndSaveAction.emit()
  }

  getChatbotByIdOrSlug(){
    if(this.chatbots_name_list){
      let chatbotById = this.chatbots_name_list.find(el => el.id === this.action.botId)
      if(chatbotById){
        return chatbotById
      }
      let chatbotBySlug = this.chatbots_name_list.find(el => el.slug === this.action.botSlug)
      if(chatbotBySlug){
        return chatbotBySlug
      }
    }
  }

  formatBotSlug(slug: string, element: HTMLElement){
    if (slug.startsWith('{{') && slug.endsWith('}}')) {
      //add variable css class
      element.classList.add('set-attribute-value')
      //not use ( )
      return slug.slice(2, slug.length - 2);
    }else{
      //use ( )
    }
    return slug
  }




}
