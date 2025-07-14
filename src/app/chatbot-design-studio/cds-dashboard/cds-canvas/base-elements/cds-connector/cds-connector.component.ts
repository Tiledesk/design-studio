import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ConnectorService } from 'src/app/chatbot-design-studio/services/connector.service';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
// import { Intent } from 'src/app/models/intent-model';

@Component({
  selector: 'cds-connector',
  templateUrl: './cds-connector.component.html',
  styleUrls: ['./cds-connector.component.scss'],
})
export class CdsConnectorComponent implements OnInit {
  private subscriptionChangeIntent: Subscription;
  @Input() idConnector: string;
  @Input() idConnection: string;
  @Input() isConnected: boolean;

  @Output() onShowConnector = new EventEmitter();
  @Output() onHideConnector = new EventEmitter();

  intent_display_name: string;
  idContractConnector: string;
  restoreConnector: boolean = false;
  displayConnector: string;
  // connectorDisplay: string;
  // intent: Intent;
  connector: any;

  constructor(
    private readonly stageService: StageService,
    private readonly intentService: IntentService,
    private readonly connectorService: ConnectorService
  ) {}

  ngOnInit(): void {
    this.initSubscriptions();
    this.setIdContractConnector();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.isConnected?.currentValue === false) {
      this.displayConnector = 'none';
      const element = document.getElementById(this.idContractConnector);
      if (element) {
        element.style.display = 'none'; // Nasconde il div
      }
    } else if (changes.idConnection?.currentValue) {
      this.idConnection = changes.idConnection?.currentValue;
      this.getIntentDisplayName();
    }
  }


  ngOnDestroy() {
    if (this.subscriptionChangeIntent) {
      this.subscriptionChangeIntent.unsubscribe();
    }
  }

  initSubscriptions(){
    if (!this.subscriptionChangeIntent) {
      this.subscriptionChangeIntent = this.intentService.behaviorIntent.subscribe(intent => {
        const idToIntent = this.idConnection?.split('/').pop();
        if (intent?.intent_id && intent.intent_id === idToIntent) {
          this.intent_display_name = intent.intent_display_name;
        }
      });
    }
  }

  setIdContractConnector() {
    this.setIntentConnector();
    this.getIntentDisplayName();
  }

  setIntentConnector() {
    let display = true;
    if (this.idConnector) {
      this.idContractConnector = 'contract_' + this.idConnector;
      const intentId = this.idConnector.split('/')[0];
      const intent = this.intentService.getIntentFromId(intentId);
      if (intent) {
        const connectors = intent.attributes?.connectors;
        if (connectors?.[this.idConnector]) {
          this.connector = connectors[this.idConnector];
          this.idContractConnector = 'contract_' + this.idConnector;
          display = this.connector.display;
          if(display)this.connectorService.hideDefaultConnector(this.idConnection);
          // // this.connectorService.showHideConnectorByIdConnector(this.idConnection, this.connector.display);
        }
        // // const displayConnector = display ? 'none' : 'flex';
        // // this.connectorService.setDisplayElementById(this.idContractConnector, displayConnector);
      }
      this.displayConnector = display ? 'none' : 'flex';
    }
  }

  getIntentDisplayName() {
    if (this.idConnection) {
      let intentId = this.idConnection.substring(
        this.idConnection.lastIndexOf('/') + 1
      );
      intentId = intentId.replace(/#/g, '');
      const intent = this.intentService.getIntentFromId(intentId);
      if (intent) {
        this.intent_display_name = intent.intent_display_name;
      }
    }
    // console.log('getToIntentDisplayName: ', this.idConnection, this.intent_display_name);
  }

  public showConnector() {
    // // console.log('showConnector: ', this.idConnection, this.isConnected);
    if (this.idConnection && this.isConnected) {
      const idConnection = this.idConnection?.replace('#', '');
      const svgElement: HTMLElement = document.getElementById(idConnection);
      if (svgElement) {
        svgElement.setAttribute('opacity', (1).toString());
      }
      const svgElementRec: HTMLElement = document.getElementById(
        'rect_' + idConnection
      );
      if (svgElementRec) {
        svgElementRec.setAttribute('opacity', (1).toString());
      }
      const svgElementTxt: HTMLElement = document.getElementById(
        'label_' + idConnection
      );
      if (svgElementTxt) {
        svgElementTxt.setAttribute('opacity', (1).toString());
      }
    }
  }

  public hideConnector() {
    const alphaConnector = this.stageService.getAlpha() / 100;
    if (this.idConnection && this.isConnected) {
      const idConnection = this.idConnection.replace('#', '');
      const svgElement: HTMLElement = document.getElementById(idConnection);
      if (svgElement) {
        svgElement.setAttribute('opacity', alphaConnector.toString());
      }

      const svgElementRec: HTMLElement = document.getElementById(
        'rect_' + idConnection
      );
      if (svgElementRec) {
        svgElementRec.setAttribute('opacity', (1).toString());
      }
      const svgElementTxt: HTMLElement = document.getElementById(
        'label_' + idConnection
      );
      if (svgElementTxt) {
        svgElementTxt.setAttribute('opacity', (1).toString());
      }
    }
  }

  public showConnectorDefault(event: MouseEvent): void {
    event.stopPropagation();
    this.restoreConnector = false;
    this.connectorService.showDefaultConnector(this.idConnection);
  }

  public hideConnectorDefault(event: MouseEvent): void {
    event.stopPropagation();
    if (this.restoreConnector === false) {
      this.connectorService.hideDefaultConnector(this.idConnection);
    }
  }

  public restoreDefaultConnector(event: MouseEvent): void {
    event.stopPropagation();
    this.restoreConnector = true;
    this.connectorService.showDefaultConnector(this.idConnection);
    this.connectorService.hideContractConnector(this.idConnection);
    const connector = { id: this.idConnection, display: true };
    this.intentService.updateIntentAttributeConnectors(connector);
  }
}