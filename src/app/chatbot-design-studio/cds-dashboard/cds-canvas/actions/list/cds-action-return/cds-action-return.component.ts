import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import { RESPONSE_STATUS_TYPE } from 'src/app/chatbot-design-studio/utils-request';
import { ActionReturn } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-return',
  templateUrl: './cds-action-return.component.html',
  styleUrls: ['./cds-action-return.component.scss']
})
export class CdsActionReturnComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionReturn;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();

  body: string = null;
  jsonIsValid = true;
  errorMessage: string;
  autocompleteStatusOptions: Array<{label: string, value: string}> = [];

  bodyOptions: Array<{name: string, value: string, disabled: boolean, checked: boolean}> = [
    { name: 'none', value: 'none', disabled: false, checked: false },
    { name: 'json', value: 'json', disabled: false, checked: true }
  ];

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  ngOnInit(): void {
    this.logger.debug('[ACTION-RETURN] action detail: ', this.action);
    this.initialize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['action']) {
      this.initialize();
    }
  }

  private initialize(): void {
    this.bodyOptions.forEach(el => {
      el.checked = el.value === this.action?.bodyType;
    });
    if (this.action?.payload) {
      this.body = this.formatJSON(this.action.payload, '\t');
    } else {
      this.body = '';
    }
    this.autocompleteStatusOptions = [];
    RESPONSE_STATUS_TYPE.forEach(el => this.autocompleteStatusOptions.push({ label: el.label, value: el.value }));
  }

  private formatJSON(input: string, indent: string): string {
    if (!input?.length) {
      return '';
    }
    try {
      return JSON.stringify(JSON.parse(input), null, indent);
    } catch {
      return input;
    }
  }

  private isValidJson(json: string): boolean {
    try {
      JSON.parse(json);
      this.errorMessage = null;
      return true;
    } catch (e) {
      this.errorMessage = e?.message || String(e);
      return false;
    }
  }

  onChangeButtonSelect(event: {name: string, value: string, disabled: boolean, checked: boolean}): void {
    this.bodyOptions.forEach(el => {
      el.checked = el.value === event.value;
    });
    this.action.bodyType = event.value;
    if (event.value === 'none') {
      this.body = '';
      this.action.payload = '';
    } else if (!this.action.payload) {
      this.action.payload = JSON.stringify({});
      this.body = this.formatJSON(this.action.payload, '\t');
    }
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }

  onChangeTextarea(value: string, type: string): void {
    switch (type) {
      case 'body':
        this.body = value;
        this.action.payload = this.body;
        break;
      default:
        this.action[type] = value;
    }
  }

  onBlur(): void {
    if (this.action.bodyType === 'json' && this.body) {
      this.jsonIsValid = this.isValidJson(this.body);
    }
    this.updateAndSaveAction.emit({ type: TYPE_UPDATE_ACTION.ACTION, element: this.action });
  }
}
