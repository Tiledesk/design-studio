import { Component, OnInit, Input, ViewChild, ElementRef, Output, EventEmitter, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Intent } from 'src/app/models/intent-model';
import { Wait, Button, Message, Command, ActionReply, MessageAttributes, ActionVoice } from 'src/app/models/action-model';
import { TYPE_UPDATE_ACTION, TYPE_INTENT_ELEMENT, TYPE_COMMAND, TYPE_RESPONSE, TYPE_BUTTON, TYPE_URL, TYPE_MESSAGE, generateShortUID } from '../../../../../utils';

import { ControllerService } from '../../../../../services/controller.service';
import { IntentService } from '../../../../../services/intent.service';
import { ConnectorService } from '../../../../../services/connector.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ACTIONS_LIST, TYPE_ACTION } from 'src/app/chatbot-design-studio/utils-actions';


@Component({
  selector: 'cds-action-dtmf-form',
  templateUrl: './cds-action-dtmf-form.component.html',
  styleUrls: ['./cds-action-dtmf-form.component.scss']
})
export class CdsActionDTMFFormComponent implements OnInit {

  @ViewChild('scrollMe', { static: false }) scrollContainer: ElementRef;

  @Input() action: ActionVoice;
  @Input() intentSelected: Intent;
  @Input() previewMode: boolean = true
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() onConnectorChange = new EventEmitter<{type: 'create' | 'delete',  fromId: string, toId: string}>()

  // idIntentSelected: string;
  idAction: string;

  openCardButton: boolean = false;
  // buttonSelected: Button;
  // newButton: boolean = false;

  typeCommand = TYPE_COMMAND;
  typeResponse = TYPE_RESPONSE;
  typeMessage = TYPE_MESSAGE;
  typeActions = TYPE_ACTION;
  actionList = ACTIONS_LIST;

  intentName: string;
  intentNameResult: boolean;
  textGrabbing: boolean;
  arrayResponses: Array<Command>;
  typeAction: string;

  element: any;
  showTip: boolean = true;
  descriptionTooltip: string = "";
  dataInput: string;
  tipText: string;
  titlePlaceholder: string;

  public logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public intentService: IntentService,
    public controllerService: ControllerService,
    public connectorService: ConnectorService,
    public changeDetectorRef: ChangeDetectorRef
  ) { }

  // manageTooltip(){}
  // onChangeText(event){}
  // addElement(event){}


  // SYSTEM FUNCTIONS //
  ngOnInit(): void {
    this.logger.log('ActionDTMFFormComponent ngOnInit', this.action, this.intentSelected);
    // // this.logger.log('ngOnInit panel-response::: ', this.typeAction);
    this.typeAction = (this.action._tdActionType === TYPE_ACTION.RANDOM_REPLY ? TYPE_ACTION.RANDOM_REPLY : TYPE_ACTION.REPLY);
    try {
      this.element = Object.values(ACTIONS_LIST).find(item => item.type === this.action._tdActionType);
      if(this.action._tdActionTitle && this.action._tdActionTitle != ""){
        this.dataInput = this.action._tdActionTitle;
      }
      this.logger.log('ActionDTMFFormComponent action:: ', this.element);
    } catch (error) {
      this.logger.log("error ", error);
    }
    this.action._tdActionId = this.action._tdActionId?this.action._tdActionId:generateShortUID();
    this.idAction = this.intentSelected.intent_id+'/'+this.action._tdActionId;
    // this.initialize();

    this.changeDetectorRef.detectChanges();
  }



  /**
   * 
   * @param changes 
   * IMPORTANT! serve per aggiornare il dettaglio della action nel pannello
   */
  ngOnChanges(changes: SimpleChanges): void {
    if(this.action && this.intentSelected) this.initialize();
  }






  // CUSTOM FUNCTIONS //
  /** */
  private initialize() {
    this.openCardButton = false;
    this.arrayResponses = [];
    this.intentName = '';
    this.intentNameResult = true;
    this.textGrabbing = false;
    if (this.action) {
      try {
        this.arrayResponses = this.action.attributes.commands;
      } catch (error) {
        this.logger.log('error:::', error);
      }
    }
    this.scrollToBottom();
  }


  /** */
  scrollToBottom(): void {
    setTimeout(() => {
      try {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        this.scrollContainer.nativeElement.animate({ scrollTop: 0 }, '500');
      } catch (error) {
        this.logger.log('scrollToBottom ERROR: ', error);
      }
    }, 300);
  }


  // EVENT FUNCTIONS //


  // on drag //
  /** */
  mouseDown() {
    this.textGrabbing = true;
  }

  /** */
  mouseUp() {
    this.textGrabbing = false;
  }

  /** */
  drop(event: CdkDragDrop<string[]>) {
    // this.logger.log( 'DROP REPLY ---> ',event, this.arrayResponses);
    this.textGrabbing = false;
    try {
      let currentPos = event.currentIndex*2+1;
      let previousPos = event.previousIndex*2+1;
      const waitCur = this.arrayResponses[currentPos-1];
      const msgCur = this.arrayResponses[currentPos];
      const waitPre = this.arrayResponses[previousPos-1];
      const msgPre = this.arrayResponses[previousPos];
      this.arrayResponses[currentPos-1] = waitPre;
      this.arrayResponses[currentPos] = msgPre;
      this.arrayResponses[previousPos-1] = waitCur;
      this.arrayResponses[previousPos] = msgCur;
      // this.logger.log( 'DROP REPLY ---> ', this.arrayResponses);
      this.connectorService.updateConnector(this.intentSelected.id);
      const element = {type: TYPE_UPDATE_ACTION.ACTION, element: this.intentSelected};
      this.onUpdateAndSaveAction(element);
    } catch (error) {
      this.logger.log('drop ERROR', error);
    }
  }


  // on action //
  /** */
  onMoveUpResponse(index: number) {
    if(index<2)return;
    try {
      let from = index - 1;
      let to = from - 2;
      this.arrayResponses.splice(to, 0, this.arrayResponses.splice(from, 1)[0]); 
      from = index;
      to = from - 2;
      this.arrayResponses.splice(to, 0, this.arrayResponses.splice(from, 1)[0]);
      // this.logger.log( 'onMoveUpResponse ---> ', this.arrayResponses);
      this.connectorService.updateConnector(this.intentSelected.id);
      const element = {type: TYPE_UPDATE_ACTION.ACTION, element: this.action};
      this.onUpdateAndSaveAction(element);
    } catch (error) {
      this.logger.log('onAddNewResponse ERROR', error);
    }
  }

  /** */
  onMoveDownResponse(index: number) {
    if(index === this.arrayResponses.length-1)return;
    try {
      let from = index;
      let to = from + 2;
      this.arrayResponses.splice(to, 0, this.arrayResponses.splice(from, 1)[0]); 
      from = index - 1;
      to = from + 2;
      this.arrayResponses.splice(to, 0, this.arrayResponses.splice(from, 1)[0]);
      // this.logger.log( 'onMoveUpResponse ---> ', this.arrayResponses);
      this.connectorService.updateConnector(this.intentSelected.id);
      const element = {type: TYPE_UPDATE_ACTION.ACTION, element: this.action};
      this.onUpdateAndSaveAction(element);
    } catch (error) {
      this.logger.log('onAddNewResponse ERROR', error);
    }
  }


  /** onAddNewActionReply */
  onAddNewActionReply(ele) {
    this.logger.log('onAddNewActionReply: ', ele);
    try {
      let message = new Message(ele.message.type, ele.message.text);
      if (ele.message.attributes) {
        message.attributes = ele.message.attributes;
      }
      if (ele.message.metadata) {
        message.metadata = ele.message.metadata;
      }
      const wait = new Wait();
      let command = new Command(ele.type);
      command.message = message;
      this.arrayResponses.splice(this.arrayResponses.length-2, 0, wait)
      this.arrayResponses.splice(this.arrayResponses.length-2, 0, command)
      this.arrayResponses.join();
      this.scrollToBottom();
      const element = {type: TYPE_UPDATE_ACTION.ACTION, element: this.action};
      this.onUpdateAndSaveAction(element);
    } catch (error) {
      this.logger.log('onAddNewResponse ERROR', error);
    }
  }


  /** onDeleteActionReply */
  onDeleteActionReply(index: number) {
    this.logger.log('onDeleteActionReply: ', this.arrayResponses[index]);
    // !!! cancello tutti i connettori di una action
    var intentId = this.idAction.substring(0, this.idAction.indexOf('/'));
    try {
      let buttons = this.arrayResponses[index].message.attributes.attachment.buttons;
      buttons.forEach(button => {
        this.logger.log('button: ', button);
        if(button.__isConnected){
          this.connectorService.deleteConnectorFromAction(intentId, button.__idConnector);
          // this.connectorService.deleteConnector(button.__idConnector);
        }
      });
    } catch (error) {
      this.logger.log('onAddNewResponse ERROR', error);
    }
    // cancello l'elemento wait precedente 
    this.logger.log('**** arrayResponses: ', this.arrayResponses, 'index-1: ', (index-1));
    const wait = this.arrayResponses[index-1];
    this.logger.log('wait: ', wait);
    if( wait && wait.type === this.typeCommand.WAIT){
      this.arrayResponses.splice(index-1, 2); 
    } else {
      this.arrayResponses.splice(index, 1); 
    }
    this.logger.log('onDeleteActionReply', this.arrayResponses);
    const element = {type: TYPE_UPDATE_ACTION.ACTION, element: this.action};
    this.onUpdateAndSaveAction(element);
  }

  /** onChangingReplyAction */
  onChangeActionReply(event) {
    const element = {type: TYPE_UPDATE_ACTION.ACTION, element: this.action};
    this.logger.log('onChangeActionReply ************', element);
    this.onUpdateAndSaveAction(element);
  }

  /** onConnectorChangeReply */
  onConnectorChangeReply(event){
    this.logger.log('onConnectorChangeReply ************', event);
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    this.onConnectorChange.emit(event)
  }
  


  // on button action //

  /** onCreateNewButton */
  onCreateNewButton(index){
    this.logger.log('[ActionDTMFForm] onCreateNewButton: ', index);
    try {
      if(!this.arrayResponses[index].message.attributes || !this.arrayResponses[index].message.attributes.attachment){
        this.arrayResponses[index].message.attributes = new MessageAttributes();
      }
    } catch (error) {
      this.logger.error('error: ', error);
    }
    let buttonSelected = this.createNewButton();
    if(buttonSelected){
      this.arrayResponses[index].message.attributes.attachment.buttons.push(buttonSelected);
      this.logger.log('[ActionDTMFForm] onCreateNewButton: ', this.action, this.arrayResponses);
      // this.intentService.setIntentSelected(this.intentSelected.intent_id);
      this.intentService.selectAction(this.intentSelected.intent_id, this.action._tdActionId);
      const element = {type: TYPE_UPDATE_ACTION.ACTION, element: this.action};
      this.onUpdateAndSaveAction(element);
    }
  }

  private createNewButton() {
    const idButton = generateShortUID();
    if(this.intentSelected.intent_id){
      this.idAction = this.intentSelected.intent_id+'/'+this.action._tdActionId;
      const idActionConnector = this.idAction+'/'+idButton;
      let buttonSelected = new Button(
        idButton,
        idActionConnector,
        false,
        TYPE_BUTTON.TEXT,
        'Button',
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

  /** onDeleteButton */
  onDeleteButton(event){
    let button = event.buttons[event.index];
    event.buttons.splice(event.index, 1);
    var intentId = this.idAction.substring(0, this.idAction.indexOf('/'));
    this.connectorService.deleteConnectorFromAction(intentId, button.__idConnector);
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }


  /**  onUpdateAndSaveAction: 
   * function called by all actions in @output whenever they are modified!
   * 1 - update connectors
   * 2 - update intent
   * */
  public async onUpdateAndSaveAction(element) {
    this.logger.log('[ActionDTMFForm] onUpdateAndSaveAction:::: ', this.action, element);
    // this.connectorService.updateConnector(this.intentSelected.intent_id);
    this.updateAndSaveAction.emit(this.action);
  }

  // on intent name //

  /** onChangeIntentName */
  onChangeIntentName(name: string) {
    name.toString();
    try {
      this.intentName = name.replace(/[^A-Z0-9_]+/ig, "");
    } catch (error) {
      this.logger.log('name is not a string', error)
    }
  }

  /** onBlurIntentName */
  onBlurIntentName(name: string) {
    this.intentNameResult = true;
  }

  /** onDisableInputMessage */
  onDisableInputMessage() {
    try {
      this.action.attributes.disableInputMessage = !this.action.attributes.disableInputMessage;
      this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
    } catch (error) {
      this.logger.log("Error: ", error);
    }
  }


  /** appdashboard-button-configuration-panel: onOpenButtonPanel */
  onOpenButtonPanel(buttonSelected) {
    this.logger.log('onOpenButtonPanel 2 :: ', buttonSelected);
    // this.intentService.setIntentSelected(this.intentSelected.intent_id);
    this.intentService.selectAction(this.intentSelected.intent_id, this.action._tdActionId);
    this.controllerService.openButtonPanel(buttonSelected);
  }

  onOpenPanelActionDetail(event){
    this.logger.log('onOpenPanelActionDetail :: ',this.controllerService.isOpenActionDetailPanel$, event, this.action);
    if(!this.controllerService.isOpenActionDetailPanel$){
      this.intentService.setIntentSelected(this.intentSelected.intent_id);
      this.controllerService.openActionDetailPanel(TYPE_INTENT_ELEMENT.ACTION, this.action);
    }
  }



  /** appdashboard-button-configuration-panel: Save button */
  onSaveButton(button) {
    // this.logger.log('onSaveButton :: ', button, this.response);
    // this.generateCommandsWithWaitOfElements();
  }

 

  /** appdashboard-button-configuration-panel: Close button panel */
  onCloseButtonPanel() {
    this.logger.log('onCloseButtonPanel :: ');
    this.openCardButton = false;
  }

  onFocusOutEvent(event) {
    // this.logger.log('onFocusOutEvent ::::::: ', event);
    // this.onCloseButtonPanel()
  }
  
}
