import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
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
export class CdsActionSetRatingComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionSetRating;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();

  /** Force update is hidden, not removed: the close webhook runs before the user rates, so it is not needed now.
   *  A value already saved on the action still works in the engine. Set to true to show it again. */
  showForceUpdate: boolean = false;

  ratingValues: Array<string> = ['1', '2', '3', '4', '5'];
  /** passed to cds-textarea so that a quick value can refresh the field */
  ratingControl = new FormControl<string>('');

  // Connectors (success = true branch, else = false branch): the connector store saves them
  idIntentSelected: string;
  idConnectorTrue: string;
  idConnectorFalse: string;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor() { }

  ngOnInit(): void {
    this.logger.log("[ACTION-SET-RATING] action", this.action)
    this.initializeAttributes();
    if (this.intentSelected) {
      this.initializeConnector();
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

  /** 'rating' (default) or 'attributes': where the engine saves the value */
  onChangeTarget(value: 'rating' | 'attributes', property: string) {
    this.action[property] = value;
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
