import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs/internal/Subscription';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import { checkConnectionStatusOfAction, updateConnector } from 'src/app/chatbot-design-studio/utils-connectors';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';
import { ActionSetRating } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-set-rating',
  templateUrl: './cds-action-set-rating.component.html',
  styleUrls: ['./cds-action-set-rating.component.scss']
})
export class CdsActionSetRatingComponent implements OnInit, OnDestroy {

  @Input() intentSelected: Intent;
  @Input() action: ActionSetRating;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();

  ratingValues: Array<string> = ['1', '2', '3', '4', '5'];
  /** passed to cds-textarea so that a quick value can refresh the field */
  ratingControl = new FormControl<string>('');

  // Connectors (success = true branch, else = false branch)
  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;
  idConnectionTrue: string;
  idConnectionFalse: string;
  isConnectedTrue: boolean = false;
  isConnectedFalse: boolean = false;
  connector: any;
  private subscriptionChangedConnector: Subscription;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly intentService: IntentService
  ) { }

  ngOnInit(): void {
    this.logger.log("[ACTION-SET-RATING] action", this.action)
    this.initializeAttributes();
    this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
      const connectorId = this.idIntentSelected + '/' + this.action._tdActionId;
      if (connector?.fromId?.startsWith(connectorId)) {
        this.connector = connector;
        this.updateConnector();
      }
    });
    if (this.intentSelected) {
      this.initializeConnector();
    }
  }

  ngOnDestroy(): void {
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  /** the default error variable is offered in the {} picker of the other actions */
  private initializeAttributes(): void {
    const userDefined = variableList.find(el => el.key === 'userDefined');
    if (!userDefined) return;
    if (!userDefined.elements.some(v => v.name === 'rating_error')) {
      userDefined.elements = [...userDefined.elements, { name: 'rating_error', value: 'rating_error' }];
    }
  }

  // ---------- connectors ----------
  initializeConnector(): void {
    this.idIntentSelected = this.intentSelected.intent_id;
    this.idConnectorTrue = this.idIntentSelected + '/' + this.action._tdActionId + '/true';
    this.idConnectorFalse = this.idIntentSelected + '/' + this.action._tdActionId + '/false';
    const resp = checkConnectionStatusOfAction(this.action, this.idConnectorTrue, this.idConnectorFalse);
    this.isConnectedTrue = resp.isConnectedTrue;
    this.isConnectedFalse = resp.isConnectedFalse;
    this.idConnectionTrue = resp.idConnectionTrue;
    this.idConnectionFalse = resp.idConnectionFalse;
  }

  private updateConnector(): void {
    const resp = updateConnector(this.connector, this.action, this.isConnectedTrue, this.isConnectedFalse, this.idConnectionTrue, this.idConnectionFalse);
    if (resp) {
      this.isConnectedTrue = resp.isConnectedTrue;
      this.isConnectedFalse = resp.isConnectedFalse;
      this.idConnectionTrue = resp.idConnectionTrue;
      this.idConnectionFalse = resp.idConnectionFalse;
      if (resp.emit) {
        this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.CONNECTOR, element: this.connector });
      }
    }
  }

  // ---------- fields ----------
  onChangeTextarea(event: string, property: string) {
    this.logger.log("[ACTION-SET-RATING] onChangeTextarea", property, event)
    this.action[property] = event
  }

  onSelectRatingValue(value: string) {
    this.action.rating = value;
    this.ratingControl.patchValue(value);
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeCheckbox(event, target) {
    this.action[target] = !this.action[target];
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION-SET-RATING] onSelectedAttribute", property, event)
    this.action[property] = event.value;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onBlur() {
    this.updateAndSaveAction.emit();
  }

}
