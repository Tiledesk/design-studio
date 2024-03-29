import { ConnectorService } from 'src/app/chatbot-design-studio/services/connector.service';
import { ControllerService } from 'src/app/chatbot-design-studio/services/controller.service';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { CdsActionVoiceComponent } from './../cds-action-dtmf-form/cds-action-voice.component';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';

@Component({
  selector: 'cds-action-blind-transfer',
  templateUrl: './cds-action-blind-transfer.component.html',
  styleUrls: ['./cds-action-blind-transfer.component.scss']
})
export class CdsActionBlindTransferComponent extends CdsActionVoiceComponent implements OnInit {

  
  constructor(
    public override intentService: IntentService,
    public override controllerService: ControllerService,
    public override connectorService: ConnectorService,
    public override changeDetectorRef: ChangeDetectorRef
  ) { 
    super(intentService, controllerService, connectorService, changeDetectorRef);
  }

}
