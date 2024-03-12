
import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';

import { Message, Wait, Button, MessageAttributes, Expression } from 'src/app/models/action-model';
import { TYPE_BUTTON, replaceItemInArrayForKey } from '../../../../../../../utils';
import { IntentService } from '../../../../../../../services/intent.service';
import { ConnectorService } from '../../../../../../../services/connector.service';
import { Subscription } from 'rxjs/internal/Subscription';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-reply-settings',
  templateUrl: './cds-action-reply-settings.component.html',
  styleUrls: ['./cds-action-reply-settings.component.scss']
})
export class CdsActionReplySettingsComponent implements OnInit {
  @ViewChild('autosize') autosize: CdkTextareaAutosize;
  
  @Output() updateAndSaveAction = new EventEmitter();
  @Output() changeActionReply = new EventEmitter();

  @Input() idAction: string;
  @Input() response: Message;
  @Input() wait: Wait;
  @Input() index: number;
  @Input() previewMode: boolean = true;

  // Textarea //
  // Delay //
  delayTime: number;


  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private connectorService: ConnectorService,
    private intentService: IntentService
  ) { }

  // SYSTEM FUNCTIONS //
  ngOnInit(): void {
    this.initialize();
  }

  /** */
  ngOnDestroy() {
  }
  
  // ngOnChanges(changes: SimpleChanges): void {
  //   this.logger.log('CdsActionReplyTextComponent ngOnChanges:: ', this.response);
  // }

  // PRIVATE FUNCTIONS //

  private initialize(){
    this.delayTime = (this.wait && this.wait.time)? (this.wait.time/1000) : 500;
  }


  // EVENT FUNCTIONS //

  /** onChangeTextarea */
  onChangeTextarea(text:string, key: string) {
    if(!this.previewMode){
      this.response[key] = text;
      // this.changeActionReply.emit();
    }
  }

  onBlur(event){
    this.logger.log('[ACTION REPLY SETTINGS] onBlur', event.target.value, this.response.text);
    // if(event.target.value !== this.response.text){
      this.changeActionReply.emit();
    // }
  }

  onSelectedAttribute(variableSelected: {name: string, value: string}){
  }

  checkForVariablesInsideText(text: string){
    text.match(new RegExp(/(?<=\{\{)(.*)(?=\}\})/g, 'g')).forEach(match => {
      let createTag = '<span class="tag">' + match + '</span>'
      text = text.replace('{' + match + '}',createTag)
    });
    return text
  }
}
