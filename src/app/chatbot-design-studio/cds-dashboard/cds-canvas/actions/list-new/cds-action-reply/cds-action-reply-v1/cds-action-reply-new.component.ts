import { Component, OnInit, OnChanges, Input, ViewChild, ElementRef, Output, EventEmitter, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Intent } from 'src/app/models/intent-model';
import { Wait, Button, Message, Command, ActionReply, MessageAttributes } from 'src/app/models/action-model';
import {
  TYPE_UPDATE_ACTION,
  TYPE_INTENT_ELEMENT,
  TYPE_COMMAND,
  TYPE_MESSAGE,
  TYPE_BUTTON,
  TYPE_URL,
  generateShortUID
} from '../../../../../../utils';
import { ControllerService } from '../../../../../../services/controller.service';
import { IntentService } from '../../../../../../services/intent.service';
import { ConnectorService } from '../../../../../../services/connector.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { TYPE_ACTION, ACTIONS_LIST } from 'src/app/chatbot-design-studio/utils-actions';

@Component({
  selector: 'cds-action-reply-new',
  templateUrl: './cds-action-reply-new.component.html',
  styleUrls: ['./cds-action-reply-new.component.scss']
})
export class CdsActionReplyNewComponent implements OnInit, OnChanges {
  // ============ Inputs & Outputs ============
  @Input() action: ActionReply;
  @Input() intentSelected: Intent;
  @Input() connector: any;
  @Input() previewMode: boolean = true;

  @Output() updateAndSaveAction = new EventEmitter<ActionReply>();
  @Output() onConnectorChange = new EventEmitter<{ type: 'create' | 'delete'; fromId: string; toId: string }>();

  @ViewChild('scrollMe', { static: false }) scrollContainer: ElementRef;

  // ============ State ============
  arrayResponses: Command[] = [];
  typeAction: string;
  idAction: string;
  openCardButton: boolean = false;
  textGrabbing: boolean = false;
  intentName: string = '';
  intentNameResult: boolean = true;

  // ============ Constants (Type Enums) ============
  readonly typeCommand = TYPE_COMMAND;
  readonly typeMessage = TYPE_MESSAGE;
  readonly typeActions = TYPE_ACTION;
  readonly actionList = ACTIONS_LIST;

  // ============ View Model ============
  element: any;

  // ============ Services ============
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly intentService: IntentService,
    private readonly controllerService: ControllerService,
    private readonly connectorService: ConnectorService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  // ============ Lifecycle Hooks ============

  ngOnInit(): void {
    console.log('[CdsActionReplyNew] ngOnInit called');
    console.log('[CdsActionReplyNew] this.action:', this.action);
    console.log('[CdsActionReplyNew] this.intentSelected:', this.intentSelected);

    this.logger.log('CdsActionReplyNewComponent ngOnInit', this.action, this.intentSelected);

    if (!this.action) {
      console.warn('[CdsActionReplyNew] Action is undefined in ngOnInit!');
      return;
    }

    this.typeAction = this.action._tdActionType === TYPE_ACTION.RANDOM_REPLY
      ? TYPE_ACTION.RANDOM_REPLY
      : TYPE_ACTION.REPLY;

    try {
      this.element = Object.values(ACTIONS_LIST).find(item => item.type === this.action._tdActionType);
    } catch (error) {
      this.logger.error('Failed to find action element', error);
    }

    if (!this.action._tdActionId) {
      this.action._tdActionId = generateShortUID();
    }
    this.idAction = `${this.intentSelected.intent_id}/${this.action._tdActionId}`;

    if (this.action && this.intentSelected) {
      this.initialize();
    }

    this.changeDetectorRef.detectChanges();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.action && this.intentSelected) {
      this.initialize();
    }
  }

  // ============ Initialization ============

  private initialize(): void {
    this.openCardButton = false;
    this.arrayResponses = [];
    this.intentName = '';
    this.intentNameResult = true;
    this.textGrabbing = false;

    console.log('[CdsActionReplyNew] initialize() called with action:', this.action);
    console.log('[CdsActionReplyNew] action.attributes:', this.action?.attributes);
    console.log('[CdsActionReplyNew] action.attributes.commands:', this.action?.attributes?.commands);

    try {
      this.arrayResponses = this.action?.attributes?.commands ?? [];
      console.log('[CdsActionReplyNew] arrayResponses set to:', this.arrayResponses);
    } catch (error) {
      this.logger.error('Failed to initialize arrayResponses', error);
      this.arrayResponses = [];
    }

    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      try {
        const scrollElement = this.scrollContainer?.nativeElement;
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      } catch (error) {
        this.logger.error('Failed to scroll to bottom', error);
      }
    }, 300);
  }

  // ============ Drag & Drop Handlers ============

  onMouseDown(): void {
    this.textGrabbing = true;
  }

  onMouseUp(): void {
    this.textGrabbing = false;
  }

  async drop(event: CdkDragDrop<string[]>): Promise<void> {
    this.textGrabbing = false;

    try {
      const currentPos = event.currentIndex * 2 + 1;
      const previousPos = event.previousIndex * 2 + 1;

      // Swap wait + message pairs
      const [waitCur, msgCur] = [this.arrayResponses[currentPos - 1], this.arrayResponses[currentPos]];
      const [waitPre, msgPre] = [this.arrayResponses[previousPos - 1], this.arrayResponses[previousPos]];

      this.arrayResponses[currentPos - 1] = waitPre;
      this.arrayResponses[currentPos] = msgPre;
      this.arrayResponses[previousPos - 1] = waitCur;
      this.arrayResponses[previousPos] = msgCur;

      this.connectorService.updateConnector(this.intentSelected.intent_id);
      await this.onUpdateAndSaveAction(this.action);
    } catch (error) {
      this.logger.error('Drop operation failed', error);
    }
  }

  // ============ Response Handlers ============

  onMoveUpResponse(index: number): void {
    if (index < 2) return;

    try {
      this.swapResponsePair(index - 2, index);
      this.connectorService.updateConnector(this.intentSelected.intent_id);
      this.onUpdateAndSaveAction(this.action);
    } catch (error) {
      this.logger.error('Failed to move response up', error);
    }
  }

  onMoveDownResponse(index: number): void {
    if (index >= this.arrayResponses.length - 1) return;

    try {
      this.swapResponsePair(index, index + 2);
      this.connectorService.updateConnector(this.intentSelected.intent_id);
      this.onUpdateAndSaveAction(this.action);
    } catch (error) {
      this.logger.error('Failed to move response down', error);
    }
  }

  private swapResponsePair(fromIndex: number, toIndex: number): void {
    this.arrayResponses.splice(toIndex, 0, ...this.arrayResponses.splice(fromIndex, 2));
  }

  onAddNewActionReply(event: any): void {
    this.logger.log('Adding new action reply', event);

    try {
      const message = new Message(event.message.type, event.message.text);
      if (event.message.attributes) {
        message.attributes = event.message.attributes;
      }
      if (event.message.metadata) {
        message.metadata = event.message.metadata;
      }

      const command = new Command(event.type);
      command.message = message;

      this.arrayResponses.push(new Wait());
      this.arrayResponses.push(command);
      this.scrollToBottom();
      this.onUpdateAndSaveAction(this.action);
    } catch (error) {
      this.logger.error('Failed to add new action reply', error);
    }
  }

  onDeleteActionReply(index: number): void {
    this.logger.log('Deleting action reply at index', index);

    try {
      // Delete all connectors from buttons in this action
      const intentId = this.idAction.substring(0, this.idAction.indexOf('/'));
      const buttons = this.arrayResponses[index]?.message?.attributes?.attachment?.buttons;

      if (buttons && Array.isArray(buttons)) {
        buttons.forEach(button => {
          if (button.__isConnected) {
            this.connectorService.deleteConnectorFromAction(intentId, button.__idConnector);
          }
        });
      }

      // Delete the wait + message pair
      const waitElement = this.arrayResponses[index - 1];
      if (waitElement?.type === this.typeCommand.WAIT) {
        this.arrayResponses.splice(index - 1, 2);
      } else {
        this.arrayResponses.splice(index, 1);
      }

      this.onUpdateAndSaveAction(this.action);
    } catch (error) {
      this.logger.error('Failed to delete action reply', error);
    }
  }

  onChangeActionReply(event: any): void {
    this.onUpdateAndSaveAction(this.action);
  }

  onChangeJsonButtons(event: any, index: number): void {
    this.logger.log('JSON buttons changed', event, index);
    this.onChangeActionReply(event);
  }

  // ============ Button Handlers ============

  onCreateNewButton(index: number): void {
    this.logger.log('Creating new button at index', index);

    try {
      const response = this.arrayResponses[index];
      if (!response?.message?.attributes || !response.message.attributes.attachment) {
        response.message.attributes = new MessageAttributes();
      }

      const newButton = this.createNewButton();
      if (newButton) {
        response.message.attributes.attachment.buttons.push(newButton);
        this.intentService.selectAction(this.intentSelected.intent_id, this.action._tdActionId);
        this.onUpdateAndSaveAction(this.action);
      }
    } catch (error) {
      this.logger.error('Failed to create new button', error);
    }
  }

  onDeleteButton(event: { buttons: Button[]; index: number }): void {
    try {
      const button = event.buttons[event.index];
      event.buttons.splice(event.index, 1);

      const intentId = this.idAction.substring(0, this.idAction.indexOf('/'));
      this.connectorService.deleteConnectorFromAction(intentId, button.__idConnector);
      this.updateAndSaveAction.emit(this.action);
    } catch (error) {
      this.logger.error('Failed to delete button', error);
    }
  }

  onOpenButtonPanel(buttonSelected: Button): void {
    this.logger.log('Opening button panel', buttonSelected);
    this.intentService.selectAction(this.intentSelected.intent_id, this.action._tdActionId);
    this.controllerService.openButtonPanel(buttonSelected);
  }

  onOpenPanelActionDetail(command: Command): void {
    if (!this.controllerService.isOpenActionDetailPanel$) {
      this.intentService.setIntentSelected(this.intentSelected.intent_id);
      this.controllerService.openActionDetailPanel(TYPE_INTENT_ELEMENT.ACTION, this.action);
    }
  }

  // ============ Settings Handlers ============

  onChangeIntentName(name: string): void {
    try {
      this.intentName = name.replace(/[^A-Z0-9_]+/gi, '');
    } catch (error) {
      this.logger.error('Failed to change intent name', error);
    }
  }

  onBlurIntentName(): void {
    this.intentNameResult = true;
  }

  onDisableInputMessage(): void {
    try {
      this.action.attributes.disableInputMessage = !this.action.attributes.disableInputMessage;
      this.updateAndSaveAction.emit(this.action);
    } catch (error) {
      this.logger.error('Failed to toggle disable input message', error);
    }
  }

  // ============ Internal Helpers ============

  private createNewButton(): Button | null {
    const idButton = generateShortUID();

    if (this.intentSelected?.intent_id) {
      this.idAction = `${this.intentSelected.intent_id}/${this.action._tdActionId}`;
      const idActionConnector = `${this.idAction}/${idButton}`;

      return new Button(
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
    }

    return null;
  }

  // ============ Public Event Emitter ============

  async onUpdateAndSaveAction(element: ActionReply): Promise<void> {
    this.logger.log('Saving action', element);
    this.updateAndSaveAction.emit(element);
  }
}
