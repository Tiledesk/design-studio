import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { ConnectorService } from 'src/app/chatbot-design-studio/services/connector.service';
import { ControllerService } from 'src/app/chatbot-design-studio/services/controller.service';
import { CdsActionVoiceComponent } from '../cds-action-voice-base/cds-action-voice.component';

@Component({
  selector: 'cds-action-speech-form',
  templateUrl: './cds-action-speech-form.component.html',
  styleUrls: ['./cds-action-speech-form.component.scss']
})
export class CdsActionSpeechFormComponent extends CdsActionVoiceComponent implements OnInit {

  constructor(
    public override intentService: IntentService,
    public override controllerService: ControllerService,
    public override connectorService: ConnectorService,
    public override changeDetectorRef: ChangeDetectorRef,
  ) { 
    super(intentService, controllerService, connectorService, changeDetectorRef);
  }


}
