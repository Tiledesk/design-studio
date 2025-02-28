import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
// import { ActionWebhook } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { Project } from 'src/app/models/project-model';
import { AppConfigService } from 'src/app/services/app-config';
import { DashboardService } from 'src/app/services/dashboard.service';
import { WebhookService } from 'src/app/services/webhook.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-webhook',
  templateUrl: './cds-action-webhook.component.html',
  styleUrls: ['./cds-action-webhook.component.scss']
})
export class CdsActionWebhookComponent implements OnInit {


  @Input() intentSelected: Intent;
  @Input() action: any;
  @Input() previewMode: boolean = true;
  
  @Output() updateIntentFromConnectorModification = new EventEmitter();
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<any>();
    
  serverBaseURL: string;
  project: Project;
  chatbot_id: string;
  webhookUrl: string;

  messageText: string = '';

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly webhookService: WebhookService,
    private readonly appConfigService: AppConfigService,
    private readonly dashboardService: DashboardService
  ) { }

  ngOnInit(): void {
    this.initialize();
  }


  initialize(){
    this.serverBaseURL = this.appConfigService.getConfig().apiUrl;
    this.chatbot_id = this.dashboardService.id_faq_kb;
    this.getWebhook();
  }

  getWebhook(){
    this.webhookService.getWebhook(this.chatbot_id).subscribe({ next: (resp: any)=> {
      this.logger.log("[cds-action-webhook] getWebhook : ", resp);
      this.webhookUrl = this.serverBaseURL+'webhook/'+resp.webhook_id;
    }, error: (error)=> {
      this.logger.error("[cds-action-webhook] error getWebhook: ", error);
    }, complete: () => {
      this.logger.log("[cds-action-webhook] getWebhook completed.");
    }});
  }


  regenerateWebhook(){
    this.webhookService.regenerateWebhook(this.chatbot_id).subscribe({ next: (resp: any)=> {
      this.logger.log("[cds-action-webhook] regenerateWebhook : ", resp);
      this.webhookUrl = this.serverBaseURL+'webhook/'+resp.webhook_id;
    }, error: (error)=> {
      this.showMessage('error regenerating webhook '+JSON.stringify(error));
      this.logger.error("[cds-action-webhook] error regenerateWebhook: ", error);
    }, complete: () => {
      this.logger.log("[cds-action-webhook] regenerateWebhook completed.");
      this.showMessage('Webhook successfully regenerated!');
    }});
  }





  async copyText(): Promise<void> {
    if (navigator?.clipboard) {
      try {
        await navigator.clipboard.writeText(this.webhookUrl);
        this.logger.log('Testo copiato con successo!');
        this.showMessage('Text copied successfully!');
      } catch (err) {
        this.logger.error('Errore nella copia:', err);
        this.showMessage('Error copying text: ' +JSON.stringify(err));
      }
    } else {
      this.logger.log('Clipboard API non è supportata da questo browser.');
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
