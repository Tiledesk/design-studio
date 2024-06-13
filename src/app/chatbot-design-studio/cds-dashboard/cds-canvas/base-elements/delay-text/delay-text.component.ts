import { Component, OnInit, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { secondsToDhms } from 'src/app/utils/util';

@Component({
  selector: 'appdashboard-delay-text',
  templateUrl: './delay-text.component.html',
  styleUrls: ['./delay-text.component.scss']
})
export class CDSDelayTextComponent implements OnInit {

  @ViewChild('input_text') inputEl: ElementRef;

  @Input() delayTime: number;
  @Input() label: string = 'CDSCanvas.delay';
  @Input() min: number = 0;
  @Input() max: number = 10;
  @Output() changeDelayTime = new EventEmitter();
  @Output() clickDelayTime = new EventEmitter();

  delayOpen: boolean;
  focusSlider: boolean;

  delayTimeUnit: string
  unit: string = 's'

  constructor() { }

  ngOnInit(): void {
    this.delayOpen = false;
    this.focusSlider = true;

    this.delayTimeUnit = this.formatLabel(this.delayTime)  
  }

  ngAfterViewInit() {
    
  }

  // EVENTS //
  formatLabel(value: number): string {
    this.delayTime = value;

    const d = secondsToDhms(this.delayTime).getDays();
    const h = secondsToDhms(this.delayTime).getHours();
    const m = secondsToDhms(this.delayTime).getMinutes();

    let number = this.delayTime
    let unit = 's' 
    if(d > 0){
      number = d;
      unit = 'd'
    } else if(h > 0){
      number = h;
      unit = 'h'
    }else if( m> 0){
      number = m;
      unit = 'm'
    }
    return number + unit
    // return `${value}`+ 's';
  }

  closeDelaySlider(){
    this.delayOpen = false;
    this.changeDelayTime.emit(this.delayTime);
  }

  onChangeText(){
    if(this.delayTime<0) this.delayTime = 0
    this.delayTimeUnit = this.formatLabel(this.delayTime)  
    // this.closeDelaySlider()
    // this.changeDelayTime.emit(this.delayTime);
  }

  onBlur(){
    this.closeDelaySlider()
    this.changeDelayTime.emit(this.delayTime);
  }

  onFocusOutDelay(){
    if( this.focusSlider === false){
      this.closeDelaySlider();
    }
  }

  onFocusInput(){
    this.focusSlider = true;
    this.delayOpen = true;
    this.setFocus()
  }

  onFocusOutSlider(){
    this.focusSlider = false;
    this.closeDelaySlider();
  }

  onDelayClick(){
    if(this.delayOpen === true){
      this.closeDelaySlider();
    } else {
      this.delayOpen = true;
      this.setFocus()
    }
    this.clickDelayTime.emit(this.delayOpen);
  }


  setFocus(){
    setTimeout(() => {
      this.inputEl.nativeElement.focus();
    }, 500);
  }


  

}
