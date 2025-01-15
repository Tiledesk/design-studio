import { Component, EventEmitter, OnInit, Input, Output, ViewChild, ElementRef } from '@angular/core';
import { timeInterval } from 'rxjs';
import { OPTIONS } from 'src/app/chatbot-design-studio/utils';

@Component({
  selector: 'cds-options',
  templateUrl: './cds-options.component.html',
  styleUrls: ['./cds-options.component.scss']
})
export class CdsOptionsComponent implements OnInit {
  @ViewChild('alphaInput') alphaInput!: ElementRef;

  @Input() stateUndoRedo: any;
  @Output() onOptionClicked = new EventEmitter<{ option: OPTIONS; alpha?: any }>();

  OPTIONS = OPTIONS;
  alphaStart: number = 100;
  alpha:number;
  isMoreMenu: boolean = false;

  

  constructor() { }

  ngOnInit(): void {
    this.alpha = this.alphaStart;
  }

  updateAlpha() {
    const svgElement = document.querySelector('#tds_svgConnectors') as HTMLElement;
    if (svgElement) {
      const paths = svgElement.querySelectorAll('path');
      paths.forEach((path) => {
        path.setAttribute('opacity', (this.alpha / 100).toString());
      });
    }
    const svgLines = document.querySelectorAll('.line-text-connector');
    svgLines.forEach((svgLine) => {
      const rect = svgLine.querySelector('rect');
      rect.setAttribute('opacity', (this.alpha / 100).toString());
      const text = svgLine.querySelector('text');
      text.setAttribute('opacity', (this.alpha / 100).toString());
    });
    this.onOptionClicked.emit({ option: OPTIONS.ALPHA, alpha: this.alpha });
  }

  forceAlphaFocus(): void {
    this.alphaInput.nativeElement.focus();
  }


  closeMenu(){
    this.isMoreMenu = false;
  }

  onOptionClick(option){
    // this.onOptionClicked.emit({option: option});
    this.onOptionClicked.emit({option: option});
  }


  onTogleMoreMenu(){
    this.isMoreMenu = !this.isMoreMenu;
    if(this.isMoreMenu){
      setTimeout(() => {
        if (this.alphaInput) {
          this.forceAlphaFocus();
        }
      }, 0);
    } 
  }
}
