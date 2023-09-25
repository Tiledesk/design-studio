import { Component, OnInit, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Intent } from '../../../models/intent-model';
import { TYPE_INTENT_ELEMENT, TYPE_ACTION } from '../../utils';


@Component({
  selector: 'cds-panel-detail',
  templateUrl: './cds-panel-detail.component.html',
  styleUrls: ['./cds-panel-detail.component.scss']
})
export class CdsPanelDetailComponent implements OnInit {
  
  @Input() isOpenPanelDetail: boolean;
  @Input() elementSelected: any;
  @Input() listOfActions: Array<{ name: string, value: string, icon?: string }>;

  // @Output() closeAndSavePanelIntentDetail = new EventEmitter();
  // @Output() clickedInsidePanelIntentDetail = new EventEmitter();

  // @Input() elementIntentSelected: any;
  // @Input() showSpinner: boolean;
  // @Input() intentSelected: Intent;
  

  @ViewChild('panel_detail_div', { static: false }) private elementRef: ElementRef;
  typeIntentElement = TYPE_INTENT_ELEMENT;
  typeAction = TYPE_ACTION;


  elementIntentSelectedType: string = "action";

  
  // elementSelected: any;
  elementSelectedIndex: number;
  elementSelectedMaxLength: number[] = [];
  
  openCardButton = false;
  // listOfActions: Array<{ name: string, value: string, icon?: string }>;;


  constructor() { }

  ngOnInit(): void {
    //this.isOpenPanelDetail = true;
  }

  ngOnChanges() {
    // console.log('ngOnChanges:: ', this.elementSelected);
  }

  @HostListener('document:mousedown', ['$event'])
  onGlobalClick(event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpenPanelDetail = false;
      console.log("FUORI");
    } else {
      this.isOpenPanelDetail = true;
      console.log("DENTRO");
    }
  }

  // EVENT FUNCTIONS //
  onUpdateFormIntentSelected($event){
    this.elementSelected = $event;
    // console.log("onUpdateFormIntentSelected:::: ", $event);
  }

  onUpdateAnswerIntentSelected($event){
    this.elementSelected = $event;
    // console.log("updateAnswerIntentSelected:::: ", $event);
  }

  onUpdateQuestionsIntentSelected($event){
    this.elementSelected = $event;
    // console.log("onUpdateQuestionsIntentSelected:::: ", $event);
  }




  onSaveIntent(){
    // if(this.elementIntentSelectedType === this.typeIntentElement.ACTION){
    //   this.intentSelected.actions[this.elementSelectedIndex] = this.elementSelected;
    // } else if(this.elementIntentSelectedType === this.typeIntentElement.ANSWER){
    //   this.intentSelected.answer = this.elementSelected;
    // } else if(this.elementIntentSelectedType === this.typeIntentElement.QUESTION){
    //   this.intentSelected.question = this.elementSelected;
    // } else if(this.elementIntentSelectedType === this.typeIntentElement.FORM){
    //   this.intentSelected.form = this.elementSelected;
    // }
    // console.log('----> onSaveIntent:: ', this.elementIntentSelectedType, this.intentSelected);
    // this.closeAndSavePanelIntentDetail.emit(this.intentSelected);
  }

  onCloseIntent(){
    // console.log('----> onCloseIntent:: ', this.elementIntentSelectedType, this.intentSelected);
    // this.closeAndSavePanelIntentDetail.emit();
  }

  
  



}
