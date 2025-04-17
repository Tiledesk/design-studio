import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { OPTIONS } from 'src/app/chatbot-design-studio/utils';

@Component({
  selector: 'cds-change-alpha-color',
  templateUrl: './change-alpha-color.component.html',
  styleUrls: ['./change-alpha-color.component.scss']
})
export class ChangeAlphaColorComponent implements OnInit {

  @Output() close = new EventEmitter();
  @Output() changeAlphaConnectors = new EventEmitter<number>();


  alpha: 0
  constructor() { }

  ngOnInit(): void {
    //empty
  }

  updateAlphaConnectors() {
    const slider: any = document.getElementById('alphaRange');
    const span: any = document.querySelector('.slider-value');
    if (slider && span) {
        const value = slider.value;
        console.log("updateAlphaConnectors: ",slider);
        let width = slider.clientWidth-20;
        let left = value*width/100;
        span.style.left = left+'px';
        span.style.setProperty('--value', left);
        this.changeAlphaConnectors.emit(this.alpha);
    }
  }

  onClose(){
    this.close.emit();
  }

}
