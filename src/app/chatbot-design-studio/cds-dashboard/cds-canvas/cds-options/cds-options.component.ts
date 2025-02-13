import { Component, EventEmitter, OnInit, Input, Output, ViewChild, ElementRef } from '@angular/core';
import { timeInterval } from 'rxjs';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { OPTIONS } from 'src/app/chatbot-design-studio/utils';

@Component({
  selector: 'cds-options',
  templateUrl: './cds-options.component.html',
  styleUrls: ['./cds-options.component.scss']
})
export class CdsOptionsComponent implements OnInit {
  @ViewChild('alphaInput') alphaInput!: ElementRef;
  @Input() id_faq_kb: any;
  @Input() stateUndoRedo: any;
  @Output() onOptionClicked = new EventEmitter<{ option: OPTIONS; alpha?: any }>();

  OPTIONS = OPTIONS;
  alpha: number;
  isMoreMenu: boolean = false;
  stageSettings: any;
  
  

  constructor(
    private readonly stageService: StageService
  ) { }

  ngOnInit(): void {
    this.initialize();
  }


  private initialize(){
    this.alpha = this.stageService.getAlpha();
  }

  updateAlphaConnectors() {
    this.onOptionClicked.emit({ option: OPTIONS.ALPHA, alpha: this.alpha });
  }

  forceAlphaConnectorsFocus(): void {
    this.alphaInput.nativeElement.focus();
  }

  closeAlphaConnectorsMenu(){
    this.isMoreMenu = false;
  }


  onOptionClick(option){
    this.onOptionClicked.emit({option: option});
  }

  onTogleAlphaConnectorsMenu(){
    this.isMoreMenu = !this.isMoreMenu;
    if(this.isMoreMenu){
      setTimeout(() => {
        if (this.alphaInput) {
          this.forceAlphaConnectorsFocus();
        }
      }, 0);
    } 
  }
}
