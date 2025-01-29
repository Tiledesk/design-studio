import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';

@Component({
  selector: 'cds-connector',
  templateUrl: './cds-connector.component.html',
  styleUrls: ['./cds-connector.component.scss']
})
export class CdsConnectorComponent implements OnInit {
  @Input() idConnector: string;
  @Input() idConnection: string;
  @Input() isConnected: boolean;

  @Output() onShowConnector = new EventEmitter();
  @Output() onHideConnector = new EventEmitter();

  constructor(
    private stageService: StageService
  ) { }

  ngOnInit(): void {
  }

  public showConnector(){
    const alphaConnector = Number(this.stageService.getAlpha());
    if(alphaConnector == 0 && this.idConnection && this.isConnected){
      const idConnection = this.idConnection.replace('#', '');
      const svgElement = document.getElementById(idConnection) as HTMLElement;
      if(svgElement){
        svgElement.setAttribute('opacity', (1).toString());
      }
      const svgElementRec = document.getElementById('rect_'+idConnection) as HTMLElement;
      if(svgElementRec){
        svgElementRec.setAttribute('opacity', (1).toString());
      }
      const svgElementTxt = document.getElementById('label_'+idConnection) as HTMLElement;
      if(svgElementTxt){
        svgElementTxt.setAttribute('opacity', (1).toString());
      }
    }
  }

  public hideConnector(){
    const alphaConnector = this.stageService.getAlpha();
    if(alphaConnector == 0 && this.idConnection && this.isConnected){
      const idConnection = this.idConnection.replace('#', '');
      const svgElement = document.getElementById(idConnection) as HTMLElement;
      if(svgElement){
        svgElement.setAttribute('opacity', (0).toString());
      }
      const svgElementRec = document.getElementById('rect_'+idConnection) as HTMLElement;
      if(svgElementRec){
        svgElementRec.setAttribute('opacity', (0).toString());
      }
      const svgElementTxt = document.getElementById('label_'+idConnection) as HTMLElement;
      if(svgElementTxt){
        svgElementTxt.setAttribute('opacity', (0).toString());
      }
    }
  }

}
