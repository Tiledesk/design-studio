import { Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-radio-buttons',
  templateUrl: './radio-button.component.html',
  styleUrls: ['./radio-button.component.scss']
})
export class CDSRadioButtonComponent implements OnInit {

  @Input() items: [{name: string, value: any, disabled: boolean, checked: boolean}]
  @Input() itemSelected: any
  @Input() bindLabelButton: string = 'name'
  @Input() bindValueButton: string = 'value'
  @Input() color: string;
  @Input() rows: number = 1;
  @Input() columns: number = 1;
  @Output() changeButtonSelect = new EventEmitter<any>();

  logger: LoggerService = LoggerInstance.getInstance()
  constructor(
    private elementRef: ElementRef) { }

  ngOnInit(): void {
    this.logger.log('[RADIO-BUTTON] itemsss', this.items)
  }

  ngOnChanges(changes: SimpleChanges){
    if(this.color) this.elementRef.nativeElement.querySelector('.content').style.setProperty('--selectedColor', this.color);
    if(this.rows) this.elementRef.nativeElement.querySelector('.content').style.setProperty('--rows', this.rows);
    if(this.columns) this.elementRef.nativeElement.querySelector('.content').style.setProperty('--columns', this.columns);
    
    if(this.itemSelected && this.items){
      //   this.itemSelected = this.items.find(el => el[this.bindValueSelect] === this.itemSelected)
      try {
        this.items.forEach(el => { el[this.bindValueButton] === this.itemSelected? el.checked= true: el.checked = false })
      } catch (error) {
        console.error('ERROR', error);
      }
      
    }

  }

  onChangeButton(event){
    this.changeButtonSelect.emit(event.value)
  }

}
