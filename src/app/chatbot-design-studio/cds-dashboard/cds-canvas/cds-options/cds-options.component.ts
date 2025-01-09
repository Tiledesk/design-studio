import { Component, EventEmitter, OnInit, Input, Output } from '@angular/core';
import { OPTIONS } from 'src/app/chatbot-design-studio/utils';

@Component({
  selector: 'cds-options',
  templateUrl: './cds-options.component.html',
  styleUrls: ['./cds-options.component.scss']
})
export class CdsOptionsComponent implements OnInit {

  @Input() stateUndoRedo: any;
  @Output() onOptionClicked = new EventEmitter<OPTIONS>();
  OPTIONS = OPTIONS

  alpha: number = 30;

  

  constructor() { }

  ngOnInit(): void {

  }

  updateAlpha() {
    const alphaHex = Math.round((this.alpha / 100) * 255).toString(16).padStart(2, '0');
    const svgElement = document.querySelector('#tds_svgConnectors') as HTMLElement;
    if (svgElement) {
      svgElement.style.stroke = `#b1b1b1${alphaHex}`;
    }

    const svgLines = document.querySelectorAll('.line-text-connector');
    svgLines.forEach((svgLine) => {
      const element = svgLine as SVGElement;
      element.setAttribute('opacity', (this.alpha*3 / 100).toString());
    });

  }

  onOptionClick(option){
    this.onOptionClicked.emit(option)
  }

}
