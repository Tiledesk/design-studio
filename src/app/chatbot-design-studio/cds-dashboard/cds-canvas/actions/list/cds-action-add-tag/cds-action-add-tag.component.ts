import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatChipInputEvent } from '@angular/material/chips';
import { TYPE_UPDATE_ACTION } from 'src/app/chatbot-design-studio/utils';
import { tagsList } from 'src/app/chatbot-design-studio/utils-variables';
import { ActionAddTag, ActionCode } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-add-tag',
  templateUrl: './cds-action-add-tag.component.html',
  styleUrls: ['./cds-action-add-tag.component.scss']
})
export class CdsActionAddTagComponent implements OnInit {

  @Input() intentSelected: Intent;
  @Input() action: ActionAddTag;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();
  
  newTag: string = '';
  autocompleteOptions: Array<string> = [];

  radioOptions: Array<{name: string, value: string, disabled: boolean, checked: boolean}>= [ 
    {name: 'CDSCanvas.Conversation',            value: 'request',            disabled: false, checked: true  }, 
    {name: 'CDSCanvas.Contact',                 value: 'lead',               disabled: false, checked: false },
  ]

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor() { }

  ngOnInit(): void {
    this.logger.log("[ACTION-ADD-TAG] action", this.action)
    this.checkIfTagAlreadyExist()
    this.logger.log("[ACTION-ADD-TAG] tagsList", tagsList)
    
  }

  onChangeButtonSelect(event: {label: string, value: string, disabled: boolean, checked: boolean}){
    this.radioOptions.forEach(el => { el.value ===event.value? el.checked= true: el.checked = false })
    this.action.target = event.value
    
    /** rebuild autocomplete options for input field based on new radio option selected */
    this.autocompleteOptions = [];
    tagsList.find(el => el.key === this.action.target).elements.forEach(el => this.autocompleteOptions.push(el.name))
    
    this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }


  onChangeText(text: string){
    this.logger.log("[ACTION-ADD-TAG] onChangeText", text)
    this.newTag = text
  }

  onAddTag(){
    this.logger.log("[ACTION-ADD-TAG] onAddTag", this.newTag)
    /**if tag already exsit to not add to autocomplete options and tags list */
    let exist = this.autocompleteOptions.some(el => el.includes(this.newTag))
    if(!exist){
      this.autocompleteOptions.push(this.newTag);
      tagsList.find(el => el.key === this.action.target).elements.unshift({name: this.newTag})
    }
    /**if same key already exist in action tags array, do not add again */
    let existInAction = this.action.tags.some(el => el.includes(this.newTag))
    if(!existInAction){
      this.action.tags.push(this.newTag)
    }
    this.newTag = ''; //reset tag for new add
    this.updateAndSaveAction.emit();
  }

  removeTag(tag: string){
    this.logger.log("[ACTION-ADD-TAG] removeTag", tag)
    let index = this.action.tags.findIndex(el => el === tag)
    if(index > -1){
      this.action.tags.splice(index, 1)
    }

    let autocompleteIndex = this.autocompleteOptions.findIndex(el => el === tag)
    console.log('indexxxxx', autocompleteIndex)
    if(autocompleteIndex > -1 ){
      this.autocompleteOptions.splice(autocompleteIndex, 1)
    }
    this.updateAndSaveAction.emit();
  }


  checkIfTagAlreadyExist(){
    this.autocompleteOptions = [];
    this.action.tags.forEach((tag) => {
      let index = tagsList.find(el => el.key === this.action.target).elements.findIndex(el => el.name === tag)
      
      if(index === -1){
        tagsList.find(el => el.key === this.action.target).elements.push({name: tag})
      }
    });
    console.log('checkIfTagAlreadyExist', tagsList)
    tagsList.find(el => el.key === this.action.target).elements.forEach(el => this.autocompleteOptions.push(el.name))
  }

  onBlur(){

  }

}
