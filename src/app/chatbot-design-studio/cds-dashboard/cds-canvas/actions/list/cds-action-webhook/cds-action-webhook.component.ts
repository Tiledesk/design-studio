import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActionWebhook } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { Project } from 'src/app/models/project-model';
import { AppConfigService } from 'src/app/services/app-config';
import { DashboardService } from 'src/app/services/dashboard.service';
import { WebhookService } from 'src/app/services/webhook.service';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-webhook',
  templateUrl: './cds-action-webhook.component.html',
  styleUrls: ['./cds-action-webhook.component.scss']
})
export class CdsActionWebhookComponent implements OnInit {


  @Input() intentSelected: Intent;
  @Input() action: ActionWebhook;
  @Input() previewMode: boolean = true;
  
  @Output() updateIntentFromConnectorModification = new EventEmitter();
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<any>();
    
  serverBaseURL: string;
  project: Project;
  chatbot_id: string;
  webhookUrl: string;

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
    // this.project = this.dashboardService.project;
    this.chatbot_id = this.dashboardService.id_faq_kb;
    // this.webhookService.initialize(serverBaseURL, this.project._id);
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


}
