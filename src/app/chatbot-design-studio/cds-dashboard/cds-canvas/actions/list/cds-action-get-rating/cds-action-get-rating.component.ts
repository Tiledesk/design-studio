import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import { variableList } from 'src/app/chatbot-design-studio/utils-variables';
import { ActionGetRating } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-get-rating',
  templateUrl: './cds-action-get-rating.component.html',
  styleUrls: ['./cds-action-get-rating.component.scss']
})
export class CdsActionGetRatingComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionGetRating;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor() { }

  ngOnInit(): void {
    this.logger.debug("[ACTION-GET-RATING] action", this.action);
    this.initializeAttributes();
  }

  /** the default output variables are offered in the {} picker of the other actions */
  private initializeAttributes() {
    const userDefined = variableList.find(el => el.key === 'userDefined');
    if (!userDefined) return;
    const new_attributes = [];
    for (const name of ['rating_value', 'rating_message']) {
      if (!userDefined.elements.some(v => v.name === name)) {
        new_attributes.push({ name: name, value: name });
      }
    }
    userDefined.elements = [...userDefined.elements, ...new_attributes];
  }

  /** 'rating' (default) or 'attributes': where the engine reads the value */
  onChangeTarget(value: 'rating' | 'attributes', property: string) {
    this.action[property] = value;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onChangeTextarea(event: string, property: string) {
    this.logger.log("[ACTION-GET-RATING] onChangeTextarea", property, event)
    this.action[property] = event
  }

  onBlur() {
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onSelectedAttribute(event, property) {
    this.logger.log("[ACTION-GET-RATING] onSelectedAttribute", property, event)
    this.action[property] = event.value;
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

}
