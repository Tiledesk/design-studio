import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CdsActionVoiceComponent } from '../cds-action-voice-base/cds-action-voice.component';
import { ConnectorService } from 'src/app/chatbot-design-studio/services/connector.service';
import { ControllerService } from 'src/app/chatbot-design-studio/services/controller.service';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';

@Component({
  selector: 'cds-action-record',
  templateUrl: './cds-action-audio-record.component.html',
  styleUrls: ['./cds-action-audio-record.component.scss']
})
export class CdsActionAudioRecordComponent extends CdsActionVoiceComponent implements OnInit {

  constructor(
    public override intentService: IntentService,
    public override controllerService: ControllerService,
    public override connectorService: ConnectorService,
    public override changeDetectorRef: ChangeDetectorRef
  ) { 
    super(intentService, controllerService, connectorService, changeDetectorRef);
  }


}
