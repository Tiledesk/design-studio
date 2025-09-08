import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-ai-condition',
  templateUrl: './ai-condition.component.html',
  styleUrls: ['./ai-condition.component.scss']
})
export class AiConditionComponent implements OnInit {
    @Input() intent: any;
    @Input() index: number;
    @Input() listOfIntents: Array<{name: string, value: string, icon?:string}>;
    @Output() updateAndSaveAction = new EventEmitter;
    @Output() updateAndSaveConnectors = new EventEmitter;
    @Output() deleteCondition = new EventEmitter;
    
    label: string;
    propmt: string;
    conditionIntentId: string;
    placeholder: string = "Go down this path if";
  constructor() { }

  ngOnInit(): void {
    this.label = this.intent.label;
    this.propmt = this.intent.prompt;
    this.conditionIntentId = this.intent.conditionIntentId;
  }

  onBlur(event: any) {
    this.propmt = this.intent.prompt;
    this.updateAndSaveAction.emit({
      value: event
    });
  }

  onChangeTextarea(event: any) {
    this.intent.prompt = event;
  }

  onChangeBlockSelect(event: any) {
    this.intent.conditionIntentId = event.value;
    this.updateAndSaveConnectors.emit({
      value: event,
      type: 'create'
    });
  }

  onResetBlockSelect(event: any) {
    this.intent.conditionIntentId = null;   
    this.updateAndSaveConnectors.emit({
      value: event,
      type: 'delete'
    });
  }

  onDeleteCondition() {
    this.deleteCondition.emit({
      value: this.intent
    });
  }
}
