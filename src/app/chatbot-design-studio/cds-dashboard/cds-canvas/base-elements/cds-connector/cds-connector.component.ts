import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Subject, BehaviorSubject, EMPTY } from 'rxjs';
import { takeUntil, switchMap, distinctUntilChanged } from 'rxjs/operators';
import { ConnectorService } from 'src/app/chatbot-design-studio/services/connector.service';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { DashboardService } from 'src/app/services/dashboard.service';
// import { Intent } from 'src/app/models/intent-model';

@Component({
  selector: 'cds-connector',
  templateUrl: './cds-connector.component.html',
  styleUrls: ['./cds-connector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CdsConnectorComponent implements OnInit {
  private readonly destroy$ = new Subject<void>();
  /** Intent id a cui questo connector è collegato (derivato da idConnection); usato per sottoscriversi solo ai suoi aggiornamenti. */
  private readonly intentId$ = new BehaviorSubject<string | null>(null);
  /** Alpha (0-1) usato in hideConnector, aggiornato a ogni showConnector per evitare getAlpha() a ogni mouseleave. */
  private cachedAlpha = 0;
  /** Id derivati da idConnection (senza #), calcolati una volta per evitare ripetute replace/concat su mouseenter/mouseleave. */
  private idConnectionClean: string | null = null;
  private rectId: string | null = null;
  private labelId: string | null = null;
  /** Cache elementi DOM per linea/rect/label; invalidata al cambio di idConnection. */
  private svgLineEl: HTMLElement | null = null;
  private svgRectEl: HTMLElement | null = null;
  private svgLabelEl: HTMLElement | null = null;
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
    private readonly connectorService: ConnectorService,
    private readonly dashboardService: DashboardService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cachedAlpha = this.stageService.getAlpha() / 100;
    this.intentId$.next(this.getIntentIdFromConnection());
    this.updateConnectionIds();
    this.initSubscriptions();
  }

  /** Restituisce l'intent_id di destinazione dal connection (idConnection dopo l'ultimo '/'). */
  private getIntentIdFromConnection(): string | null {
    const id = this.idConnection?.split('/').pop();
    return id != null && id !== '' ? id.replace(/#/g, '') : null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.isConnected?.currentValue === false) {
      this.displayConnector = 'none';
      return;
    }
    if (changes.idConnection?.currentValue !== undefined) {
      this.idConnection = changes.idConnection.currentValue;
      this.intentId$.next(this.getIntentIdFromConnection());
      this.updateConnectionIds();
      this.clearConnectionElementCache();
    }
    this.setIdContractConnector();
  }

  /** Calcola e memorizza idConnectionClean, rectId, labelId da idConnection. */
  private updateConnectionIds(): void {
    if (!this.idConnection) {
      this.idConnectionClean = null;
      this.rectId = null;
      this.labelId = null;
      return;
    }
    this.idConnectionClean = this.idConnection.replace(/#/g, '');
    this.rectId = 'rect_' + this.idConnectionClean;
    this.labelId = 'label_' + this.idConnectionClean;
  }

  /** Invalida la cache degli elementi DOM (chiamare quando idConnection cambia). */
  private clearConnectionElementCache(): void {
    this.svgLineEl = null;
    this.svgRectEl = null;
    this.svgLabelEl = null;
  }

  /** Restituisce gli elementi DOM linea/rect/label, usando cache se disponibile. */
  private getConnectionElements(): { line: HTMLElement | null; rect: HTMLElement | null; label: HTMLElement | null } {
    if (!this.idConnectionClean) {
      this.updateConnectionIds();
    }
    if (!this.idConnectionClean) {
      return { line: null, rect: null, label: null };
    }
    if (!this.svgLineEl) {
      this.svgLineEl = document.getElementById(this.idConnectionClean);
    }
    if (!this.svgRectEl && this.rectId) {
      this.svgRectEl = document.getElementById(this.rectId);
    }
    if (!this.svgLabelEl && this.labelId) {
      this.svgLabelEl = document.getElementById(this.labelId);
    }
    return { line: this.svgLineEl, rect: this.svgRectEl, label: this.svgLabelEl };
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initSubscriptions(): void {
    this.intentId$.pipe(
      switchMap((intentId) =>
        intentId
          ? this.intentService.intentUpdatesById$(intentId).pipe(
              distinctUntilChanged((a, b) => a?.intent_display_name === b?.intent_display_name)
            )
          : EMPTY
      ),
      takeUntil(this.destroy$)
    ).subscribe((intent) => {
      this.intent_display_name = intent.intent_display_name;
      this.cdr.markForCheck();
    });
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

  public showConnector(): void {
    this.cachedAlpha = this.stageService.getAlpha() / 100;
    if (!this.idConnection || !this.isConnected) return;
    const { line, rect, label } = this.getConnectionElements();
    if (line) line.setAttribute('opacity', '1');
    if (rect) rect.setAttribute('opacity', '1');
    if (label) label.setAttribute('opacity', '1');
  }

  public hideConnector(): void {
    if (!this.idConnection || !this.isConnected) return;
    const { line, rect, label } = this.getConnectionElements();
    if (line) line.setAttribute('opacity', this.cachedAlpha.toString());
    if (rect) rect.setAttribute('opacity', '1');
    if (label) label.setAttribute('opacity', '1');
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
          // Centra lo stage sull'intent selezionato (stessa animazione di cds-panel-intent-list)
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