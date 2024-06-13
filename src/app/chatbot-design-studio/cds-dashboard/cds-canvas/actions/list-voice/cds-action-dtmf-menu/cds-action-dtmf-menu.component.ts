import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { ConnectorService } from 'src/app/chatbot-design-studio/services/connector.service';
import { ControllerService } from 'src/app/chatbot-design-studio/services/controller.service';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { TYPE_COMMAND, TYPE_RESPONSE, TYPE_MESSAGE, generateShortUID, TYPE_UPDATE_ACTION, TYPE_URL, TYPE_INTENT_ELEMENT, findFreeId } from 'src/app/chatbot-design-studio/utils';
import { ActionVoice, Button, Command, Message, MessageAttributes, Wait } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { TYPE_BUTTON } from 'src/chat21-core/utils/constants';
import { TranslateService } from '@ngx-translate/core';
import { CdsActionVoiceComponent } from '../cds-action-voice-base/cds-action-voice.component';
const swal = require('sweetalert');

@Component({
  selector: 'cds-action-dtmf-menu',
  templateUrl: './cds-action-dtmf-menu.component.html',
  styleUrls: ['./cds-action-dtmf-menu.component.scss']
})
export class CdsActionDtmfMenuComponent extends CdsActionVoiceComponent implements OnInit {


  constructor(
    public override intentService: IntentService,
    public override controllerService: ControllerService,
    public override connectorService: ConnectorService,
    public override changeDetectorRef: ChangeDetectorRef,
    private translate: TranslateService
  ) { 
    super(intentService, controllerService, connectorService, changeDetectorRef);
  }



  generateNewButtonName(arrayResponseIndex: number): string{
    let buttons = this.arrayResponses[arrayResponseIndex].message.attributes.attachment.buttons
    var arrayButtonValues = buttons.map(function(item){ return +item.value }).filter(Boolean).sort();
    return findFreeId(buttons, 'value').toString()
  }


  /** onCreateNewButton */
  public override async onCreateNewButton(event){
    let index = event.index;
    let buttonValue = event.option
    this.logger.log('[ActionDTMFForm] onCreateNewButton: ', index);
    try {
      if(!this.arrayResponses[index].message.attributes || !this.arrayResponses[index].message.attributes.attachment){
        this.arrayResponses[index].message.attributes = new MessageAttributes();
      }
    } catch (error) {
      this.logger.error('error: ', error);
    }
    let buttonSelected = this.createNewButtonOption(index, buttonValue);
    if(buttonSelected){
      this.arrayResponses[index].message.attributes.attachment.buttons.push(buttonSelected);
      this.logger.log('[ActionDTMFForm] onCreateNewButton: ', this.action, this.arrayResponses);
      // this.intentService.setIntentSelected(this.intentSelected.intent_id);
      this.intentService.selectAction(this.intentSelected.intent_id, this.action._tdActionId);
      const element = {type: TYPE_UPDATE_ACTION.ACTION, element: this.action};
      this.onUpdateAndSaveAction(element);
    }
  }

  private createNewButtonOption(arrayResponseIndex: number, buttonValue: string) {
    const idButton = generateShortUID();
    // const buttonValue = this.generateNewButtonName(arrayResponseIndex)
    if(this.intentSelected.intent_id){
      this.idAction = this.intentSelected.intent_id+'/'+this.action._tdActionId;
      const idActionConnector = this.idAction+'/'+idButton;
      let buttonSelected = new Button(
        idButton,
        idActionConnector,
        false,
        TYPE_BUTTON.TEXT,
        buttonValue,
        '',
        TYPE_URL.BLANK,
        '',
        '',
        true
      );
      this.logger.log('[ActionDTMFForm] createNewButton: ', buttonSelected);
      return buttonSelected;
    }
    return null;
  }


  


}


