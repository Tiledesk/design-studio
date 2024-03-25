import { Component, OnInit, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ChangeBotLangModalComponent } from 'src/app/modals/change-bot-lang/change-bot-lang.component';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { Project } from 'src/app/models/project-model';
import { BotsBaseComponent } from 'src/app/components/bots/bots-base/bots-base.component';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { NotifyService } from 'src/app/services/notify.service';


@Component({
  selector: 'cds-detail-advanced',
  templateUrl: './advanced.component.html',
  styleUrls: ['./advanced.component.scss']
})
export class CDSAdvancedComponent extends BotsBaseComponent implements OnInit {

  @Input() selectedChatbot: Chatbot;
  @Input() project: Project;
  @Input() translationsMap: Map<string, string> = new Map();

  botDefaultSelectedLang: any;
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public dialog: MatDialog,
    private faqKbService: FaqKbService,
    private notify: NotifyService,
  ) {
    super();
  }

  ngOnInit(): void {
  }

  ngOnChanges() {
    this.logger.log('[CDS-CHATBOT-DTLS] (OnChanges) selectedChatbot ', this.selectedChatbot)
    this.destructureSelectedChatbot(this.selectedChatbot)
  }

  destructureSelectedChatbot(selectedChatbot: Chatbot) {
    this.logger.log('[CDS-CHATBOT-DTLS] - BOT LANGUAGE ', selectedChatbot.language);
    if (selectedChatbot && selectedChatbot.language) {
      this.botDefaultSelectedLang = this.botDefaultLanguages[this.getIndexOfbotDefaultLanguages(selectedChatbot.language)].name
      this.logger.log('[CDS-CHATBOT-DTLS] BOT DEAFAULT SELECTED LANGUAGE ', this.botDefaultSelectedLang);
    }
  }

  updateBotLanguage(){
    this.logger.log('openDialog')
    const dialogRef = this.dialog.open(ChangeBotLangModalComponent, {
      width: '600px',
      data: {
        chatbot: this.selectedChatbot,
        projectId: this.project._id
      },
    });
    dialogRef.afterClosed().subscribe(langCode => {
      this.logger.log(`Dialog result: ${langCode}`);
      if (langCode !== 'close') {
        this.botDefaultSelectedLang = this.botDefaultLanguages[this.getIndexOfbotDefaultLanguages(langCode)].name
      }
      this.updateChatbotLanguage(langCode)
    })
  }


  updateChatbotLanguage(langCode) {
    this.faqKbService.updateFaqKbLanguage(this.selectedChatbot._id, langCode).subscribe({ next: (faqKb) => {
      this.logger.log('[CDS-CHATBOT-DTLS] EDIT BOT LANG - FAQ KB UPDATED ', faqKb);
      if (faqKb) {
      }
    }, error: (error) => {
      this.logger.error('[CDS-CHATBOT-DTLS] EDIT BOT LANG-  ERROR ', error);
      // =========== NOTIFY ERROR ===========
      this.notify.showWidgetStyleUpdateNotification(this.translationsMap.get('CDSSetting.UpdateBotError'), 4, 'report_problem');

    }, complete: () => {
      this.logger.log('[CDS-CHATBOT-DTLS] EDIT BOT LANG - * COMPLETE *');
      // =========== NOTIFY SUCCESS===========
      this.notify.showWidgetStyleUpdateNotification(this.translationsMap.get('CDSSetting.UpdateBotSuccess'), 2, 'done');
      this.updateChatbot(this.selectedChatbot, langCode)
    }});
  }


  updateChatbot(selectedChatbot, langCode) {
    this.logger.log('updateChatbot langCode', langCode) 
    this.selectedChatbot.language = langCode
    this.faqKbService.updateChatbot(selectedChatbot).subscribe({ next: (chatbot: any) => {
      this.logger.log('[CDS-CHATBOT-DTLS] - UPDATED CHATBOT - RES ', chatbot);
    }, error:(error) => {
      this.logger.error('[CDS-CHATBOT-DTLS] - UPDATED CHATBOT - ERROR  ', error);
      // self.notify.showWidgetStyleUpdateNotification(this.create_label_error, 4, 'report_problem');
    }, complete: () => {
      this.logger.log('[CDS-CHATBOT-DTLS] - UPDATED CHATBOT * COMPLETE *');
    }});
  }

}
