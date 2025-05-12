import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslateService } from '@ngx-translate/core';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { WebhookService } from 'src/app/chatbot-design-studio/services/webhook-service.service';
import { RESERVED_INTENT_NAMES, STAGE_SETTINGS } from 'src/app/chatbot-design-studio/utils';
import { TYPE_CHATBOT } from 'src/app/chatbot-design-studio/utils-actions';
import { Intent } from 'src/app/models/intent-model';
import { Project } from 'src/app/models/project-model';
import { AppConfigService } from 'src/app/services/app-config';
import { DashboardService } from 'src/app/services/dashboard.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

const swal = require('sweetalert');

@Component({
  selector: 'cds-panel-intent-detail',
  templateUrl: './cds-panel-intent-detail.component.html',
  styleUrls: ['./cds-panel-intent-detail.component.scss']
})
export class CdsPanelIntentDetailComponent implements OnInit {
  @ViewChild('tooltip') tooltip: MatTooltip;
  @Input() intent: Intent;
  @Output() savePanelIntentDetail = new EventEmitter();
  @Output() closePanel = new EventEmitter();
  @Output() updateAndSaveAction = new EventEmitter();
  
  maximize: boolean = true;

  isStart: boolean = false;
  isWebhook: boolean = false;


  /* webhook params */
  serverBaseURL: string;
  project: Project;
  chatbot_id: string;
  webhookUrl: string;
  webhookUrlDev: string;
  messageText: string = '';
  action: any = {};
  chatbotSubtype: string;


  private readonly logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private readonly webhookService: WebhookService,
    private readonly appConfigService: AppConfigService,
    private readonly dashboardService: DashboardService,
    private readonly translate: TranslateService,
    private stageService: StageService
  ) { 
  }

  ngOnInit(): void {
    this.maximize = this.stageService.getMaximize();
    if(this.intent.intent_display_name === RESERVED_INTENT_NAMES.START) {
      this.initializeStart();
    } else if(this.intent.intent_display_name === RESERVED_INTENT_NAMES.WEBHOOK) {
      this.initializeWebhook();
    } 
  }
    

  ngOnChanges(changes: SimpleChanges): void {
    this.logger.log('[CdsPanelIntentDetailComponent] changes: ', changes)
  }



  initializeStart(){
    this.isStart = true;
    if(this.intent.agents_available !== false) this.intent.agents_available = true;
  }

  initializeWebhook(){
    this.webhookUrl = '';
    this.webhookUrlDev = '';
    this.isWebhook = true;
    this.serverBaseURL = this.appConfigService.getConfig().apiUrl;
    this.chatbot_id = this.dashboardService.id_faq_kb;
    this.chatbotSubtype = this.dashboardService.selectedChatbot.subtype?this.dashboardService.selectedChatbot.subtype:TYPE_CHATBOT.CHATBOT;
    this.getWebhook();
  }


  onAgentsAvailableChange(event: any){
    this.logger.log('[CdsPanelIntentDetailComponent] onAgentsAvailableChange:: ', event);
    this.intent.agents_available = event;
    this.onSaveIntent();
  }

  onSaveIntent(){
    this.logger.log('[CdsPanelIntentDetailComponent] onSaveIntent:: ', this.intent);
    this.savePanelIntentDetail.emit(this.intent);
  }

  getWebhook(){
    this.webhookService.getWebhook(this.chatbot_id).subscribe({ next: (resp: any)=> {
      this.logger.log("[CdsPanelIntentDetailComponent] getWebhook : ", resp);
      this.webhookUrl = this.serverBaseURL+'webhook/'+resp.webhook_id;
      this.webhookUrlDev = this.webhookUrl+"/dev";
    }, error: (error)=> {
      this.logger.error("[CdsPanelIntentDetailComponent] error getWebhook: ", error);
      // // this.createWebhook();
    }, complete: () => {
      this.logger.log("[CdsPanelIntentDetailComponent] getWebhook completed.");
    }});
  }

  
  newWebhook(){
    this.logger.log("[CdsPanelIntentDetailComponent] newWebhook.", this.project);
    if(this.webhookUrl && this.webhookUrl.trim() !== ''){
      this.regenerateWebhook();
    } else {
      this.createWebhook();
    }
  }

  createWebhook(){
    const copilot = this.chatbotSubtype === TYPE_CHATBOT.COPILOT;
    this.webhookService.createWebhook(this.chatbot_id, this.intent.intent_id, true, copilot).subscribe({ next: (resp: any)=> {
      this.logger.log("[CdsPanelIntentDetailComponent] createWebhook : ", resp);
      this.webhookUrl = this.serverBaseURL+'webhook/'+resp.webhook_id;
      this.webhookUrlDev = this.webhookUrl+"/dev";
    }, error: (error)=> {
      this.logger.error("[CdsPanelIntentDetailComponent] error createWebhook: ", error);
    }, complete: () => {
      this.logger.log("[CdsPanelIntentDetailComponent] createWebhook completed.");
    }});
  }


  onRegenerateWebhook(){
    swal({
      title: "Are you sure",
      text: 'if you regenerate the webhook url, the previous url will no longer be available',
      icon: "warning",
      buttons: ["Cancel", 'Regenerate'],
      dangerMode: false,
    })
    .then((resp: boolean) => {
      if (resp) {
        this.logger.log('[CDS DSBRD] Regenerate swal: ', resp);
        this.regenerateWebhook();
      } else {
        this.logger.log('[CDS DSBRD] Regenerate swal: ', resp);
      }
    });
  }

  regenerateWebhook(){
    this.webhookService.regenerateWebhook(this.chatbot_id).subscribe({ next: (resp: any)=> {
      this.logger.log("[CdsPanelIntentDetailComponent] regenerateWebhook : ", resp);
      this.webhookUrl = this.serverBaseURL+'webhook/'+resp.webhook_id;
      this.webhookUrlDev = this.webhookUrl+"/dev";
    }, error: (error)=> {
      this.showMessage('error regenerating webhook '+JSON.stringify(error));
      this.logger.error("[CdsPanelIntentDetailComponent] error regenerateWebhook: ", error);
    }, complete: () => {
      this.logger.log("[CdsPanelIntentDetailComponent] regenerateWebhook completed.");
      this.showMessage('Webhook successfully regenerated!');
    }});
  }


  updateCopilotWebhook(copilot){
    this.logger.log("[CdsPanelIntentDetailComponent] updateCopilotWebhook : ", copilot);
    this.webhookService.updateCopilotWebhook(this.chatbot_id, copilot).subscribe({ next: (resp: any)=> {
      this.logger.log("[CdsPanelIntentDetailComponent] updateCopilotWebhook : ", resp);
      this.updateAndSaveAction.emit();
    }, error: (error)=> {
      this.logger.error("[CdsPanelIntentDetailComponent] error updateCopilotWebhook: ", error);
    }, complete: () => {
      this.logger.log("[CdsPanelIntentDetailComponent] updateCopilotWebhook completed.");
    }});
  }



  async copyText(dev): Promise<void> {
    let url = this.webhookUrl;
    if(dev === true){
      url = this.webhookUrl +'/dev';
    }
    if (navigator?.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        this.logger.log('Text copied successfully!');
        let translatedString = this.translate.instant('CDSCanvas.DevUrlCopied');
        this.showMessage(translatedString);
        
      } catch (err) {
        this.logger.error('Error copying text:', err);
        let translatedString = this.translate.instant('CDSCanvas.TextErrorCopied');
        this.showMessage(translatedString+': ' +JSON.stringify(err));
      }
    } else {
      this.logger.log('Clipboard API not supported by your browser.');
      let translatedString = this.translate.instant('CDSCanvas.ApiNotSupported');
      this.showMessage(translatedString);
    }
  }

  private showMessage(msg: string): void {
    this.messageText = msg;
    setTimeout(() => {
      this.messageText = '';
    }, 5000);
  }
  
    onChangeMaximize(){
      this.maximize = !this.maximize;
      const id_faq_kb = this.dashboardService.id_faq_kb;
      this.stageService.saveSettings(id_faq_kb, STAGE_SETTINGS.Maximize, this.maximize);
    }
  
    onCopyToClipboard(value: string): void {
      navigator.clipboard.writeText(value).then(() => {
        this.tooltip.disabled = false;
        this.tooltip.show();
        setTimeout(() => {
          this.tooltip.hide();
          this.tooltip.disabled = true;
        }, 1000);
      });
    }
}
