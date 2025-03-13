import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { ConnectorService } from 'src/app/chatbot-design-studio/services/connector.service';
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
  idContractConnector: string;
  restoreConnector: boolean = false;

  constructor(
    private readonly stageService: StageService,
    private readonly intentService: IntentService,
    private readonly connectorService: ConnectorService
  ) { }

  ngOnInit(): void {
    this.getIntentDisplayName();
    this.setIdContractConnector();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.idConnection) {
      this.getIntentDisplayName();
      this.idConnection = changes.idConnection.currentValue;
      this.setIdContractConnector();
    }
  }

  setIdContractConnector(){
    if(this.idConnection){
      const idConnection = this.idConnection?.replace('#', '');
      this.idContractConnector = 'contract_'+idConnection;
    } 
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
    // // console.log('showConnector: ', this.idConnection, this.isConnected);
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



  public showConnectorDefault(){
    this.restoreConnector = false;
    this.connectorService.showHideConnectorByIdConnector(this.idConnection, "block");
  }

  public hideConnectorDefault(){
    if(this.restoreConnector === false){
      this.connectorService.showHideConnectorByIdConnector(this.idConnection, "none");
    }
  }

  public restoreConnectorDefault(event: MouseEvent): void {
    event.stopPropagation();
    this.restoreConnector = true;
    this.connectorService.setDisplayConnectorByIdConnector(this.idConnection);
    this.connectorService.showHideConnectorByIdConnector(this.idConnection, "block");
  }
  
}
