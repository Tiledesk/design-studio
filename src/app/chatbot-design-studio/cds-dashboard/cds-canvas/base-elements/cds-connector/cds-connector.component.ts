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
import { DashboardService } from 'src/app/services/dashboard.service';
import { outputsOf, blockOutputOf, recordIdOf, BLOCK_SLOT } from 'src/app/chatbot-design-studio/connectors/connector-catalog';

/**
 * Il pallino di un'uscita, e il riquadro col nome del blocco collegato quando la linea e'
 * nascosta.
 *
 * Due modi di usarlo. Quello nuovo: `[intent]`, `[action]` e `slot` (`true`, `false`,
 * `noInput`, `button:<uid>`, `case:<id>`, `next`...), e il componente ricava da solo, dal
 * catalogo delle uscite, l'id della propria ancora e lo stato del collegamento, e li tiene
 * aggiornati ascoltando i cambi dei connettori: le action non devono piu' sapere niente di
 * connettori. Quello vecchio: `[idConnector]`, `[idConnection]`, `[isConnected]` calcolati dal
 * componente padre; resta finche' l'ultima action non e' migrata.
 */
@Component({
  selector: 'cds-connector',
  templateUrl: './cds-connector.component.html',
  styleUrls: ['./cds-connector.component.scss'],
})
export class CdsConnectorComponent implements OnInit {
  private subscriptionChangeIntent: Subscription;
  private subscriptionChangedConnector: Subscription;

  // Modo vecchio: lo stato arriva dal padre.
  @Input() idConnector: string;
  @Input() idConnection: string;
  @Input() isConnected: boolean;

  // Modo nuovo: lo stato si ricava dal modello.
  @Input() intent: any;
  /** In alternativa a `intent`, per le uscite delle action: basta l'id del blocco. */
  @Input() intentId: string;
  @Input() action: any;
  @Input() slot: string;

  @Output() onShowConnector = new EventEmitter();
  @Output() onHideConnector = new EventEmitter();

  intent_display_name: string;
  idContractConnector: string;
  restoreConnector: boolean = false;
  displayConnector: string;
  connector: any;

  constructor(
    private readonly stageService: StageService,
    private readonly intentService: IntentService,
    private readonly connectorService: ConnectorService,
    private readonly dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.initSubscriptions();
    if (this.slot) {
      this.resolveFromModel();
      this.setIdContractConnector();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.slot) {
      if (changes.intent || changes.intentId || changes.action || changes.slot) {
        this.resolveFromModel();
      }
      this.setIdContractConnector();
      return;
    }
    this.setIdContractConnector();
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
    if (this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector.unsubscribe();
    }
  }

  /** Lo stato dell'uscita, letto dal modello attraverso il catalogo. */
  private resolveFromModel(): void {
    const intentId = this.intent?.intent_id || this.intentId;
    if (!intentId || !this.slot) { return; }
    const resolved = this.slot === BLOCK_SLOT.key
      ? (this.intent ? blockOutputOf(this.intent) : null)
      : outputsOf(intentId, this.action).find(s => s.key === this.slot) || null;
    if (!resolved) {
      this.idConnector = null;
      this.idConnection = null;
      this.isConnected = false;
      return;
    }
    this.idConnector = resolved.fromId;
    this.isConnected = !!resolved.toId;
    this.idConnection = resolved.toId ? recordIdOf(resolved.fromId, resolved.toId) : null;
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
    // Un connettore di questa uscita e' nato o morto: il campo e' gia' stato scritto dallo
    // store (ConnectorService lo chiama in cattura, prima di questo ascoltatore); qui si
    // rilegge e basta. Solo nel modo nuovo: nel vecchio lo fa il componente padre.
    if (!this.subscriptionChangedConnector) {
      this.subscriptionChangedConnector = this.intentService.isChangedConnector$.subscribe((connector: any) => {
        if (!this.slot || !this.idConnector || connector?.fromId !== this.idConnector) { return; }
        this.resolveFromModel();
        this.setIdContractConnector();
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
        }
      }
      this.displayConnector = display ? 'none' : 'flex';
    }
    if (!this.isConnected) {
      this.displayConnector = 'none';
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
  }

  public showConnector() {
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

  public onGoToIntent(event: MouseEvent): void {
    event.stopPropagation();
    if (this.idConnection) {
      let intentId = this.idConnection.substring(
        this.idConnection.lastIndexOf('/') + 1
      );
      intentId = intentId.replace(/#/g, '');
      if (intentId) {
        const intent = this.intentService.getIntentFromId(intentId);
        if (intent) {
          this.intentService.setIntentSelected(intentId);
          let stageElement = document.getElementById(intentId);
          if (stageElement) {
            let id_faq_kb = this.dashboardService.id_faq_kb;
            this.stageService.centerStageOnElement(id_faq_kb, stageElement);
          }
        }
      }
    }
  }

  public onRestoreConnector(event: MouseEvent): void {
    event.stopPropagation();
    this.restoreDefaultConnector(event);
  }
}
