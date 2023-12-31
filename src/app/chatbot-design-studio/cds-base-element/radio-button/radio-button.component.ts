import { Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-radio-buttons',
  templateUrl: './radio-button.component.html',
  styleUrls: ['./radio-button.component.scss']
})
export class CDSRadioButtonComponent implements OnInit {

  @Input() items: [{label: string, value: any, disabled: boolean, checked: boolean}]
  @Input() color: string;
  @Input() row: number = 1;
  @Input() column: number = 1;
  @Output() changeButtonSelect = new EventEmitter<any>();

  logger: LoggerService = LoggerInstance.getInstance()
  constructor(
    private elementRef: ElementRef) { }

  ngOnInit(): void {
    this.logger.log('[RADIO-BUTTON] itemsss', this.items)
  }

  ngOnChanges(changes: SimpleChanges){
    if(this.color) this.elementRef.nativeElement.querySelector('.content').style.setProperty('--selectedColor', this.color);
  }

  onChangeButton(event){
    this.changeButtonSelect.emit(event.value)
  }

}
