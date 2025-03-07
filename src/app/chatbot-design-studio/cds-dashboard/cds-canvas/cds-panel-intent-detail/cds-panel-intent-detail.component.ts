import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { WebhookService } from 'src/app/chatbot-design-studio/services/webhook-service.service';
import { RESERVED_INTENT_NAMES } from 'src/app/chatbot-design-studio/utils';
import { Intent } from 'src/app/models/intent-model';
import { Project } from 'src/app/models/project-model';
import { AppConfigService } from 'src/app/services/app-config';
import { DashboardService } from 'src/app/services/dashboard.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-panel-intent-detail',
  templateUrl: './cds-panel-intent-detail.component.html',
  styleUrls: ['./cds-panel-intent-detail.component.scss']
})
export class CdsPanelIntentDetailComponent implements OnInit {
  @Input() intent: Intent;
  @Output() savePanelIntentDetail = new EventEmitter();
  @Output() closePanel = new EventEmitter();
  @Output() updateAndSaveAction = new EventEmitter();
  
  maximize: boolean = false;

  isStart: boolean = false;
  isWebhook: boolean = false;


  /* webhook params */
  serverBaseURL: string;
  project: Project;
  chatbot_id: string;
  webhookUrl: string;
  messageText: string = '';
  action: any = {};


  private readonly logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private readonly webhookService: WebhookService,
    private readonly appConfigService: AppConfigService,
    private readonly dashboardService: DashboardService
  ) { 
  }

  ngOnInit(): void {
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
    this.isWebhook = true;
    this.serverBaseURL = this.appConfigService.getConfig().apiUrl;
    this.chatbot_id = this.dashboardService.id_faq_kb;
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
    }, error: (error)=> {
      this.logger.error("[CdsPanelIntentDetailComponent] error getWebhook: ", error);
      this.createWebhook();
    }, complete: () => {
      this.logger.log("[CdsPanelIntentDetailComponent] getWebhook completed.");
    }});
  }

  createWebhook(){
    this.webhookService.createWebhook(this.chatbot_id, this.intent.intent_id, true).subscribe({ next: (resp: any)=> {
      this.logger.log("[CdsPanelIntentDetailComponent] createWebhook : ", resp);
      this.webhookUrl = this.serverBaseURL+'webhook/'+resp.webhook_id;
    }, error: (error)=> {
      this.logger.error("[CdsPanelIntentDetailComponent] error createWebhook: ", error);
      this.createWebhook();
    }, complete: () => {
      this.logger.log("[CdsPanelIntentDetailComponent] createWebhook completed.");
    }});
  }


  regenerateWebhook(){
    this.webhookService.regenerateWebhook(this.chatbot_id).subscribe({ next: (resp: any)=> {
      this.logger.log("[CdsPanelIntentDetailComponent] regenerateWebhook : ", resp);
      this.webhookUrl = this.serverBaseURL+'webhook/'+resp.webhook_id;
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



  async copyText(): Promise<void> {
    if (navigator?.clipboard) {
      try {
        await navigator.clipboard.writeText(this.webhookUrl);
        this.logger.log('Text copied successfully!');
        this.showMessage('Text copied successfully!');
      } catch (err) {
        this.logger.error('Error copying text:', err);
        this.showMessage('Error copying text: ' +JSON.stringify(err));
      }
    } else {
      this.logger.log('Clipboard API not supported by your browser.');
      this.showMessage('Clipboard API not supported by your browser.');
    }
  }

  private showMessage(msg: string): void {
    this.messageText = msg;
    setTimeout(() => {
      this.messageText = '';
    }, 5000);
  }
  
}
