import { HEADER_TYPE } from './../../utils';
import { Component, OnInit, Output, Input, EventEmitter } from '@angular/core';
import { TYPE_METHOD_ATTRIBUTE } from '../../utils';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
@Component({
  selector: 'cds-attributes',
  templateUrl: './attributes.component.html',
  styleUrls: ['./attributes.component.scss']
})
export class AttributesComponent implements OnInit {

  @Output() changeAttributes = new EventEmitter();
  @Input() attributes: any;
  @Input() autocompleteOptions: Array<string> = [];
  @Input() method: any;
  @Input() openBlock: boolean;

  newAttributes: Array<any> = [];
  typeMethodAttribute = TYPE_METHOD_ATTRIBUTE;

  panelOpenState = true;

  logger: LoggerService = LoggerInstance.getInstance()

  constructor() { }

  ngOnInit(): void {
    // this.initialize();

  }


  ngOnChanges() {
    this.initialize();
  }


  private initialize(){
    if(!this.openBlock){
      this.openBlock = false;
    }
    this.newAttributes = [];
    try {
      Object.keys(this.attributes).forEach(key => {
        const newAtt = {"key":key, "value": this.attributes[key]};
        this.newAttributes.push(newAtt);
      });
    } catch (error) {
      // console.log("error: ", error);
    }
    this.newAttributes.push({key:"", value:""});
    if(!this.method){
      this.method = TYPE_METHOD_ATTRIBUTE.TEXT;
    }
    if(this.newAttributes.length>1) {
      this.openBlock = true;
    }

  }


  onBlur(event){
    this.logger.log('[ATTRIBUTES]  onBlur:: ', event);
    this.setChangedAttributes();
  }

  private isValidJson(json) {
    try {
      JSON.parse(json);
      return true;
    } catch (e) {
      return false;
    }
  }

  onChangeTextarea(event, index){
    this.newAttributes[index].value = event;
    // this.setChangedAttributes();
  }

  onChangeAttributes(type: 'key' | 'value', text: string, index: number){
    this.newAttributes[index][type] = text;
    let attribute = { key : text, value: this.newAttributes[index].value}
    let that = this;
    if(attribute.key.length>0 || attribute.value.length>0){
      if (index == this.newAttributes.length-1){
        this.newAttributes.push({key:"", value:""});
      }
    } else {
      this.newAttributes.forEach(function(item, index, object) {
        if(!item.key && !item.value){
          if (index < that.newAttributes.length-1){
            object.splice(index, 1);
          }
        }
      });
    }
    
    // this.setChangedAttributes();
  }

  private setChangedAttributes(){
    let attributes:  { [key: string]: string } = {};
    this.newAttributes.forEach(function(item) {
      if(item.key && item.value){
        attributes[item.key] = item.value;
      }
    });
    if(Object.keys(attributes).length === 0 || JSON.stringify(attributes) !== JSON.stringify(this.attributes)){
      this.logger.log("[ATTRIBUTES] ------- >>>> ", this.attributes, attributes);
      this.attributes = attributes;
      this.changeAttributes.emit(attributes);
    }
  }

  onClearSelectedAttribute(index){
    if(!this.newAttributes[index].value){
      this.newAttributes.splice(index, 1);
    } else {
      this.newAttributes[index].key = '';
    }
    this.setChangedAttributes();
  }
  
  onSelectedAttribute(variableSelected: {name: string, value: string}, index: number, type: "key" | "value"){
    this.logger.log('onSelectedAttribute:: ',variableSelected.value, "type::", type);
    switch(type){
      case 'key': {
        this.newAttributes[index].key = variableSelected.value;
        if(!this.newAttributes[index].value){
          this.newAttributes.push({key:"", value:""});
        }
        break;
      }
      case 'value':{
        this.newAttributes[index].value += '{{' + variableSelected.value + '}}'
        if(!this.newAttributes[index].value){
          this.newAttributes.push({key:"", value:""});
        }
        break;
      }
      default: {
        this.newAttributes[index].key = variableSelected.value;
        if(!this.newAttributes[index].value){
          this.newAttributes.push({key:"", value:""});
        }
        break;
      }
      
    }

    this.logger.log('[ATTRIBUTES] onSelectedAttribute: newAttributes', this.newAttributes)
    this.setChangedAttributes();
  }

}
