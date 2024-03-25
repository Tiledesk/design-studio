import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'cds-height-slider',
  templateUrl: './height-slider.component.html',
  styleUrls: ['./height-slider.component.scss']
})
export class HeightSliderComponent implements OnInit {

  @Input() heightIframe: number;
  @Input() step : number = 1;
  @Input() min: number = 10;
  @Input() max: number = 999;
  @Output() changeHeightIframe = new EventEmitter();
  @Output() clickHeightIframe = new EventEmitter();

  open: boolean;
  focusSlider: boolean;

  constructor() { }

  ngOnInit(): void {
    this.open = false;
    this.focusSlider = true;
    if(!this.heightIframe) this.heightIframe = 100;
  }


  // EVENTS //
  formatLabel(value: number): string {
    this.heightIframe = value;
    return `${value}`+ 'px';
  }

  closeDelaySlider(){
    this.open = false;
    // this.changeDelayTime.emit(this.delayTime);
  }

  onValueChange(){
    this.open = false;
    this.closeDelaySlider();
    //this.changeHeightIframe.emit(this.heightIframe);
    this.saveHeight();
  }

  onFocusOut(){
    if( this.focusSlider === false){
      this.closeDelaySlider();
    }
  }

  onFocusSlider(){
    this.focusSlider = true;
    this.open = true;
  }

  onFocusOutSlider(){
    this.focusSlider = false;
    this.closeDelaySlider();
  }

  onClick(){
    if(this.open === true){
      this.closeDelaySlider();
    } else {
      this.open = true;
    }
    this.clickHeightIframe.emit(this.open);
  }


  onChangeHeight(event){
    if (isNaN(event)) {
      this.heightIframe = 0;
    }
  }

  onBlurHeight(event){
    this.saveHeight();
  }


  saveHeight(){
    if(this.heightIframe < 10){
      this.heightIframe = 10;
    } 
    if(this.heightIframe > 999){
      this.heightIframe = 999;
    }
    this.changeHeightIframe.emit(this.heightIframe);
  }

}
