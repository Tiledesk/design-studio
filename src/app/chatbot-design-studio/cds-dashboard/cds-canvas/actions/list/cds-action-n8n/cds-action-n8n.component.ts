import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';

//MODELS
import { Intent } from 'src/app/models/intent-model';
import { ActionN8n } from 'src/app/models/action-model';

//SERVICES
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppConfigService } from 'src/app/services/app-config';

//UTILS
import { TYPE_UPDATE_ACTION, TYPE_METHOD_ATTRIBUTE, TEXT_CHARS_LIMIT } from 'src/app/chatbot-design-studio/utils';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';
import { CdsActionWebRequestV2Component } from '../cds-action-web-request-v2/cds-action-web-request-v2.component';

@Component({
  selector: 'cds-action-n8n',
  templateUrl: '../cds-action-web-request-v2/cds-action-web-request-v2.component.html',
  styleUrls: ['../cds-action-web-request-v2/cds-action-web-request-v2.component.scss']
})
export class CdsActionN8nComponent extends CdsActionWebRequestV2Component implements OnInit {


  @Input() project_id: string;
  
  constructor(
    public override intentService: IntentService,
    private appConfigService: AppConfigService
  ) {
    super(intentService );
  }



  goToIntegration(){
    let url = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/' + this.project_id +'/integrations?name=' + this.action._tdActionType
    window.open(url, '_blank')
  }
  goToHelp(){
    let url = "https://gethelp.tiledesk.com/articles/n8nio-action/"
    window.open(url, '_blank')
  }
}