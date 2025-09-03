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
    label: string;
    propmt: string;
    intentId: string;
    placeholder: string = "Go down this path if";
  constructor() { }

  ngOnInit(): void {
    this.label = this.intent.label;
    this.propmt = this.intent.prompt;
    this.intentId = this.intent.intentId;
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
    this.intent.intentId = event.value;
    this.updateAndSaveAction.emit({
      value: event
    });
  }

  onResetBlockSelect(event: any) {
    this.intent.intentId = '';
    this.updateAndSaveAction.emit({
      value: event
    });
  }

}
