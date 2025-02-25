import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
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

  intent_display_name: string;

  constructor(
    private readonly stageService: StageService,
    private readonly intentService: IntentService
  ) { }

  ngOnInit(): void {
    this.getIntentDisplayName();
  }

  getIntentDisplayName(){
    if(this.idConnection){
      let intentId = this.idConnection.substring(this.idConnection.lastIndexOf('/') + 1);
      intentId = intentId.replace(/#/g, '');
      const intent = this.intentService.getIntentFromId(intentId);
      if(intent){
        this.intent_display_name = intent.intent_display_name;
      }
    }
  }

  public showConnector(){
    if(this.idConnection && this.isConnected){
      const idConnection = this.idConnection?.replace('#', '');
      const svgElement: HTMLElement = document.getElementById(idConnection);
      if(svgElement){
        svgElement.setAttribute('opacity', (1).toString());
      }
      const svgElementRec: HTMLElement = document.getElementById('rect_'+idConnection);
      if(svgElementRec){
        svgElementRec.setAttribute('opacity', (1).toString());
      }
      const svgElementTxt: HTMLElement = document.getElementById('label_'+idConnection);
      if(svgElementTxt){
        svgElementTxt.setAttribute('opacity', (1).toString());
      }
    }
  }

  public hideConnector(){
    const alphaConnector = this.stageService.getAlpha()/100;
    if(this.idConnection && this.isConnected){
      const idConnection = this.idConnection.replace('#', '');
      const svgElement:HTMLElement = document.getElementById(idConnection);
      if(svgElement){
        svgElement.setAttribute('opacity', (alphaConnector).toString());
      }
      const svgElementRec:HTMLElement = document.getElementById('rect_'+idConnection);
      if(svgElementRec){
        svgElementRec.setAttribute('opacity', (alphaConnector).toString());
      }
      const svgElementTxt:HTMLElement = document.getElementById('label_'+idConnection);
      if(svgElementTxt){
        svgElementTxt.setAttribute('opacity', (alphaConnector).toString());
      }
    }
  }

}
