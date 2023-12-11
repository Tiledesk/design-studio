import { ActionEmail } from 'src/app/models/action-model';
import { Component, OnInit, Input, ElementRef, OnChanges, Output, EventEmitter } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-email',
  templateUrl: './cds-action-email.component.html',
  styleUrls: ['./cds-action-email.component.scss']
})
export class CdsActionEmailComponent implements OnInit, OnChanges {

  @Input() action: ActionEmail;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  
  email_error: boolean = false;
  // isOpenSetAttributesPanel: boolean = false
  // intents = ['uno', 'due', 'tre'];
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor() { }

  ngOnInit(): void {
    this.logger.log("[ACTION-EMAIL] elementSelected: ", this.action)
  }

  ngOnChanges() {
    this.logger.log("[CDS-ACTION-EMAIL] ngOnChanges: this.action", this.action)
  }


  onChangeTextarea($event: string, property: string) {
    if($event){
      this.logger.log("[CDS-ACTION-EMAIL] onEditableDivTextChange event", $event)
      this.logger.log("[CDS-ACTION-EMAIL] onEditableDivTextChange property", property)
      this.action[property] = $event
      // this.updateAndSaveAction.emit();
    }
  }

  onBlur(event){
    this.updateAndSaveAction.emit();
  }



  // placeCaretAtEnd(el) {
  //   el.focus();
  //   if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
  //     var range = document.createRange();
  //     range.selectNodeContents(el);
  //     range.collapse(false);
  //     var sel = window.getSelection();
  //     sel.removeAllRanges();
  //     sel.addRange(range);
  //   }
  // }


  onChangeActionButton(event) {
    //this.logger.log("event: ", event)
  }

  onToChange(event) {
    this.logger.log("[CDS-ACTION-EMAIL] onToChange event: ", event);
    this.action.to = event;
  }

  // https://stackoverflow.com/questions/45686432/need-to-add-tags-and-normal-text-in-same-input-box
  // http://jsfiddle.net/timdown/jwvha/527/


  // onOpenActionDetails() {
  //   this.logger.log( '[CDS-ACTION-EMAIL] onOpenActionDetails' )
  //   this.controllerService.openActionDetailPanel('email');
  // }


}
