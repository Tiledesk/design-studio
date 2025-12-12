import { Component, EventEmitter, OnInit, Input, Output, ViewChild, ElementRef } from '@angular/core';
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
  @Output() onOptionClicked = new EventEmitter<{ option: OPTIONS; alpha?: any; isActive?: boolean }>();

  OPTIONS = OPTIONS;
  alpha: number;
  isMoreMenu: boolean = false;
  stageSettings: any;
  isNoteModeActive: boolean = false;
  
  

  constructor(
    private readonly stageService: StageService
  ) { }

  ngOnInit(): void {
    this.initialize();
  }


  private initialize(){
    this.alpha = this.stageService.getAlpha();
  }

  // updateAlphaConnectors() {
  //   this.onOptionClicked.emit({ option: OPTIONS.ALPHA, alpha: this.alpha });
  // }

  forceAlphaConnectorsFocus(): void {
    this.alphaInput.nativeElement.focus();
  }

  closeAlphaConnectorsMenu(){
    this.isMoreMenu = false;
  }


  onOptionClick(option){
    if (option === OPTIONS.NOTE) {
      this.isNoteModeActive = !this.isNoteModeActive;
      this.onOptionClicked.emit({option: option, isActive: this.isNoteModeActive});
    } else {
      // Disattiva la modalità note se si clicca su un'altra opzione
      if (this.isNoteModeActive) {
        this.isNoteModeActive = false;
        // Notifica il componente padre che la modalità note è stata disattivata
        this.onOptionClicked.emit({option: OPTIONS.NOTE, isActive: false});
      }
      this.onOptionClicked.emit({option: option});
    }
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

  onChangeAlphaConnectors(alpha){
    this.onOptionClicked.emit({ option: OPTIONS.ALPHA, alpha: alpha });
  }
}
