import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { INTENT_ELEMENT } from '../../../../../utils';
import { Action } from 'src/app/models/action-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { BrandService } from 'src/app/services/brand.service';
import { ACTIONS_LIST } from 'src/app/chatbot-design-studio/utils-actions';

@Component({
  selector: 'cds-action-description',
  templateUrl: './cds-action-description.component.html',
  styleUrls: ['./cds-action-description.component.scss']
})
export class CdsActionDescriptionComponent implements OnInit {

  @Input() actionSelected: Action;
  @Input() elementType: string;
  @Input() previewMode: boolean = true
  @Input() showTip: boolean = false;
  // @Output() closeIntent = new EventEmitter();
  // @Output() saveIntent = new EventEmitter();
  
  titlePlaceholder: string = 'Set a title';
  element: any;
  dataInput: string;
  tparams: any;
  BRAND_BASE_INFO = BRAND_BASE_INFO

  private logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private brandService: BrandService
  ) {
    const brand = brandService.getBrand();
    this.tparams = brand;
   }

  ngOnInit(): void { 
  }

  ngOnChanges(){
    // this.logger.log('[ActionDescriptionComponent] ngOnChanges:: ', this.actionSelected, this.elementType);
    if(this.actionSelected){
      this.elementType = this.actionSelected._tdActionType;
      if(this.actionSelected._tdActionTitle && this.actionSelected._tdActionTitle != ""){
        this.dataInput = this.actionSelected._tdActionTitle;
      }
    }
    try {
      switch(this.elementType){
        case 'form':
        case 'question':
        case 'answer':
          this.element = Object.values(INTENT_ELEMENT).find(el => el.type === this.elementType)
          break;
        case 'jsoncondition':
          this.element = ACTIONS_LIST.JSON_CONDITION 
          if('noelse' in this.actionSelected) {
            this.element = ACTIONS_LIST.CONDITION
          }
          break;
        default:
          this.element = Object.values(ACTIONS_LIST).find(el => el.type === this.elementType)
          break;
      }
      // this.element = ELEMENTS_LIST.find(item => item.type === this.elementType);
      this.logger.log('[ActionDescriptionComponent] action:: ', this.element);
    } catch (error) {
      this.logger.log("[ActionDescriptionComponent] error ", error);
    }
  }

  // onCloseIntent(){
  //   this.closeIntent.emit();
  // }

  // onSaveIntent(){
  //   this.saveIntent.emit();
  // }

  onChangeText(text: string){
    this.logger.log('[ActionDescriptionComponent] onChangeText:: ', text);
    this.actionSelected._tdActionTitle = text;
  }

}
