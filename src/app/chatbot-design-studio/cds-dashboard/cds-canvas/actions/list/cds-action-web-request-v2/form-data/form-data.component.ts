import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'cds-form-data',
  templateUrl: './form-data.component.html',
  styleUrls: ['./form-data.component.scss']
})
export class FormDataComponent implements OnInit {

  @Input() dataRows: Array<{name: string, value: string, type: 'Text' | 'file', enabled: boolean}>
  @Output() onDataRowChanged = new EventEmitter<Array<{name: string, value: string, type: 'Text' | 'file', enabled: boolean}>>()

  methods: Array<{label: string, value: string}>;
  constructor() { }

  ngOnInit(): void {
    this.initialize()
  }


  initialize(){
    this.methods = [
      { label: 'Text', value: 'Text'},
      { label: 'File', value: 'file'}
    ]
    console.log('rowwwwwwww', this.dataRows)
    if(!this.dataRows || this.dataRows.length === 0){
      this.dataRows.push({ name: '', value: '', type: 'Text', enabled: true})
    }
  }

  onCheckboxChanged(event, index: number){
    this.dataRows[index].enabled = event.checked
    this.onDataRowChanged.emit(this.dataRows)
  }

  onChangeMethodButton(e: {label: string, value: 'Text' | 'file'}, index: number){
    this.dataRows[index].type = e.value;
    this.onDataRowChanged.emit(this.dataRows)
  }

  onChangeTextarea(e, type: 'name' | 'value', index: number){
    switch(type){
      case 'name': {
        this.dataRows[index]['name'] = e
        break;
      }
      case 'value' : {
        this.dataRows[index]['value'] = e
        break;
      }
    }
    this.onChangeDataRow(index)
  }

  onBlur(event){
    this.onDataRowChanged.emit(this.dataRows);
  }


  onChangeDataRow(index: number){
    let row = this.dataRows[index]
    let that = this;
    if(row.name.length>0 || row.value.length>0){
      if (index == this.dataRows.length-1){
        this.dataRows.push({ name: '', value: '', type: 'Text', enabled: true});
      }
    } else {
      this.dataRows.forEach(function(item, index, object) {
        if(!item.name && !item.value){
          if (index < that.dataRows.length-1){
            object.splice(index, 1);
          }
        }
      });
    }
    
    // this.setChangedAttributes();
  }

}
