import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { ConnectorService } from 'src/app/chatbot-design-studio/services/connector.service';
import { ControllerService } from 'src/app/chatbot-design-studio/services/controller.service';
import { CdsActionVoiceComponent } from '../cds-action-voice-base/cds-action-voice.component';

@Component({
  selector: 'cds-action-play-prompt',
  templateUrl: './cds-action-play-prompt.component.html',
  styleUrls: ['./cds-action-play-prompt.component.scss']
})
export class CdsActionPlayPromptComponent extends CdsActionVoiceComponent implements OnInit {

  constructor(
    public override intentService: IntentService,
    public override controllerService: ControllerService,
    public override connectorService: ConnectorService,
    public override changeDetectorRef: ChangeDetectorRef,
  ) { 
    super(intentService, controllerService, connectorService, changeDetectorRef);
  }


}
