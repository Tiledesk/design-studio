import { Chatbot } from 'src/app/models/faq_kb-model';
import { ActionReplaceBotV4 } from 'src/app/models/action-model';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { FaqService } from 'src/app/services/faq.service';
import { MatCheckbox } from '@angular/material/checkbox';
import { DashboardService } from 'src/app/services/dashboard.service';
import { TYPE_INTENT_NAME } from 'src/app/chatbot-design-studio/utils';

@Component({
  selector: 'cds-action-replace-bot-v4',
  templateUrl: './cds-action-replace-bot-v4.component.html',
  styleUrls: ['./cds-action-replace-bot-v4.component.scss']
})
export class CdsActionReplaceBotV4Component implements OnInit, OnChanges {

  @Input() action: ActionReplaceBotV4;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();

  chatbots_name_list: Array<{name: string, value: string, id: string, slug: string, name2: string, icon?:string}> = [];
  bot_selected: Chatbot;

  autocompleteOptions: Array<{label: string, value: string}> = [];
  autocompleteOptionsBlockName: Array<{label: string, value: string}> = [];

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private chatbotService: FaqKbService,
    private faqService: FaqService,
    private dashboardService: DashboardService
  ) { }

  ngOnInit(): void {
    this.logger.log("[ACTION REPLACE BOT V4] action (on-init): ", this.action)
    this.initialize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.logger.log("[ACTION REPLACE BOT V4] action (on-changes): ", this.action)
  }

  async initialize(){
    await this.getAllBots();
    if(this.action){
      let selectedChatbot = this.getChatbotByIdOrSlug()
      if(selectedChatbot){
        this.getAllFaqById(selectedChatbot.id)
      }
    }
  }

  /**
   * Id del chatbot da cui leggere l'elenco dei subagent invocabili:
   * - su un agent normale e' il chatbot corrente (i suoi subagent);
   * - dentro un subagent e' il PARENT, perche' gli invocabili sono i FRATELLI
   *   (un subagent non ha figli: "+ New subagent" e' disponibile solo dal parent).
   */
  private getParentFaqKbId(): string {
    const current: any = this.dashboardService.selectedChatbot;
    return current?.subtype === 'subagent'
      ? current?.parent_id
      : this.dashboardService.id_faq_kb;
  }

  /** Elenca i SUBAGENT invocabili, escluso l'agent corrente (niente auto-invocazione). */
  async getAllBots() {
    return new Promise((resolve, reject) => {
      const faqKbId = this.getParentFaqKbId();
      if (!faqKbId) {
        this.chatbots_name_list = [];
        this.autocompleteOptions = [];
        resolve(true);
        return;
      }
      this.chatbotService.getSubagentsByFaqKbId(faqKbId).subscribe({ next: (res: any) => {
        const list: any[] = Array.isArray(res) ? res : (res?.subagents || res?.data || []);
        const currentId = this.dashboardService.id_faq_kb;
        const chatbots = list.filter((a: any) => a?._id !== currentId);
        this.logger.log("[ACTION REPLACE BOT V4] chatbots: ", chatbots, this.autocompleteOptions);
        this.autocompleteOptions = [];
        this.chatbots_name_list = chatbots.map(a => {
          let name2 = a.name;
          if(a.slug) {name2 = name2 + ' (' + a.slug + ')';}
          return { name: a.name, value: a.name, slug: a.slug, id: a._id, name2: name2, icon: 'smart_toy' };
        });
        
        chatbots.forEach(el => {
          if(el.slug)
            this.autocompleteOptions.push({label: el.name + ' (' + el.slug + ')', value: el.slug})
        })
        resolve(true)
      }, error: (error) => {
        this.logger.error("[ACTION REPLACE BOT V4] error get bots: ", error);
        reject(error)
      }, complete: () => {
        this.logger.log("[ACTION REPLACE BOT V4] get all chatbots completed.");
      }})
    })
  }

  /**
   * @param autoSelectStart alla SELEZIONE di un subagent preseleziona il suo blocco di
   * partenza ('start'). Non passato in apertura pannello, per non sovrascrivere ne'
   * risalvare la scelta gia' fatta dall'utente.
   */
  getAllFaqById(chatbotId: string, autoSelectStart: boolean = false){
    this.logger.log("[ACTION REPLACE BOT V4] get AllFaqById: ",chatbotId);
    
    this.faqService.getAllFaqByFaqKbId(chatbotId).subscribe({ next: (faks)=> {
      this.autocompleteOptionsBlockName = [];
      this.autocompleteOptionsBlockName = faks.map((faq) => ({
        label: faq.intent_display_name,
        value: faq.intent_display_name
      }));
      if (autoSelectStart && !this.action?.blockName) {
        const startBlock = this.autocompleteOptionsBlockName.find(o => o.value === TYPE_INTENT_NAME.START);
        if (startBlock) {
          this.action.blockName = startBlock.value;
          this.logger.log("[ACTION REPLACE BOT V4] start block preselezionato: ", startBlock.value);
          this.updateAndSaveAction.emit();
        }
      }
      this.logger.log("[ACTION REPLACE BOT V4] get AllFaqById blocks: ", this.autocompleteOptionsBlockName);
    }, error: (error)=> {
      this.logger.error("[ACTION REPLACE BOT V4] error get AllFaqById: ", error);
    }, complete: () => {
      this.logger.log("[ACTION REPLACE BOT V4] get AllFaqById completed.");
    }})
  }

  onChangeSelect(event: {name: string, value: string, slug: string, id: string}) {
    this.logger.log("[ACTION REPLACE BOT V4] onChangeActionButton event: ", event)
    this.action.botId = event.id;
    this.action.botSlug = event.slug;
    this.action.blockName = ''
    this.getAllFaqById(event.id, true)
    this.updateAndSaveAction.emit()
    this.logger.log("[ACTION REPLACE BOT V4] action edited: ", this.action)
  }

  async onChangeTextarea(event: string, property: string) {
    this.logger.log("[ACTION REPLACE BOT V4] onEditableDivTextChange event", event)
    this.logger.log("[ACTION REPLACE BOT V4] onEditableDivTextChange property", property)
    switch(property){
      case 'botSlug':
        this.action.botSlug = event;
        (this.chatbots_name_list?.length === 0 || !this.chatbots_name_list)? await this.getAllBots(): null;
        this.action.botId = this.chatbots_name_list.find(el => el.slug === event)?.id ?? null;
        break; 
      case 'blockName':
        this.action.blockName = event
        break; 
    }
  }

  onBlur(event){
    this.updateAndSaveAction.emit();
  }

  onAutocompleteOptionSelected(option: {label: string, value: string}, key: string){
    this.logger.log("[ACTION REPLACE BOT V4] onAutocompleteOptionSelected option:",option)
    switch(key){
      case 'botSlug':
        this.action.botId = this.chatbots_name_list.find(el => (el.slug === option.value))?.id ?? null
        break; 
    }
  }

  onChangeBlockSelect(event: {name: string, value: string}){
    this.action.blockName = event.value;
    this.updateAndSaveAction.emit()
    this.logger.log("[ACTION REPLACE BOT V4] action selet block to execute: ", this.action)
  }

  onResetSelect(event, key: string){
    switch(key){
      case 'botId':
        this.action.botId = null;
        this.action.botSlug = null;
        // senza subagent selezionato il blocco non ha piu' significato: si svuota il valore
        // e le opzioni, altrimenti resterebbe puntato a un blocco del subagent precedente
        this.action.blockName = null;
        this.autocompleteOptionsBlockName = [];
        break;
      case 'blockName':
        this.action.blockName = null
        break;   
    }
    this.updateAndSaveAction.emit()
  }

  onChangeCheckbox(event: MatCheckbox, target){
    this.action[target] = !this.action[target];
    this.chatbots_name_list = this.chatbots_name_list.map(a => {
      let name2 = a.name;
      if(a.slug) {name2 = name2 + ' (' + a.slug + ')';}
      return { name: a.name, value: a.name, slug: a.slug, id: a.id, name2: name2, icon: 'smart_toy' };
    });
    if (target === "useSlug") {
      if (this.action[target]) {
        if (this.action.botId) {
          this.action.botSlug = this.getChatbotByIdOrSlug().slug
        }
      } else {
        this.action.botId = this.getChatbotByIdOrSlug().id
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

  formatBotSlug(slug: string){
    if (slug.startsWith('{{') && slug.endsWith('}}')) {
      return slug.slice(2, slug.length - 2);
    }
    
    let matches = slug.match(new RegExp(/{{[^{}]*}}/g));
    if (matches && matches.length > 0) {
      return slug;
    }

    return '(' + slug + ')'
  }

}
