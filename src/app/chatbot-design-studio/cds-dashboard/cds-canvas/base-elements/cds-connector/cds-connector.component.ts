import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
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
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { DashboardService } from 'src/app/services/dashboard.service';

@Component({
  selector: 'cds-connector',
  templateUrl: './cds-connector.component.html',
  styleUrls: ['./cds-connector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CdsConnectorComponent implements OnInit, OnChanges, OnDestroy {

  /* -------------------------------------------------------------
   *  Lifecycle helpers & reactive state
   * ------------------------------------------------------------- */

  /** Notificatore di distruzione del componente (evita memory leak). */
  private readonly destroy$ = new Subject<void>();

  /** Intent di destinazione associato al connector. */
  private readonly intentId$ = new BehaviorSubject<string | null>(null);

  /** Alpha cache usato per evitare chiamate ripetute a getAlpha(). */
  private cachedAlpha = 0;

  /* -------------------------------------------------------------
   *  ID derivati e cache DOM
   * ------------------------------------------------------------- */

  private idConnectionClean: string | null = null;
  private rectId: string | null = null;
  private labelId: string | null = null;

  /** Cache elementi DOM per ridurre lookup ripetuti. */
  private svgLineEl: HTMLElement | null = null;
  private svgRectEl: HTMLElement | null = null;
  private svgLabelEl: HTMLElement | null = null;

  /* -------------------------------------------------------------
   *  Inputs / Outputs
   * ------------------------------------------------------------- */

  @Input() idConnector: string;
  @Input() idConnection: string;
  @Input() isConnected: boolean;

  @Output() onShowConnector = new EventEmitter();
  @Output() onHideConnector = new EventEmitter();

  /* -------------------------------------------------------------
   *  Stato UI
   * ------------------------------------------------------------- */

  intent_display_name: string;
  idContractConnector: string;
  restoreConnector = false;
  displayConnector: string;

  connector: any;
  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly stageService: StageService,
    private readonly intentService: IntentService,
    private readonly connectorService: ConnectorService,
    private readonly dashboardService: DashboardService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  /* -------------------------------------------------------------
   *  Lifecycle
   * ------------------------------------------------------------- */

  ngOnInit(): void {
    this.cachedAlpha = this.stageService.getAlpha() / 100;

    // Deriva intent di destinazione
    this.intentId$.next(this.getIntentIdFromConnection());

    // Prepara ID derivati
    this.updateConnectionIds();

    // Avvia sottoscrizioni reattive
    this.initSubscriptions();
  }

  ngOnChanges(changes: SimpleChanges): void {

    // Caso: connector disconnesso → nascondi
    if (changes.isConnected?.currentValue === false) {
      this.displayConnector = 'none';
      return;
    }

    // Caso: connection cambiata
    if (changes.idConnection?.currentValue !== undefined) {
      this.idConnection = changes.idConnection.currentValue;

      this.intentId$.next(this.getIntentIdFromConnection());
      this.updateConnectionIds();
      this.clearConnectionElementCache();
    }

    this.setIdContractConnector();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* -------------------------------------------------------------
   *  Derivazione Intent / ID
   * ------------------------------------------------------------- */

  /** Estrae intent_id di destinazione dalla connection. */
  private getIntentIdFromConnection(): string | null {
    const id = this.idConnection?.split('/').pop();
    return id ? id.replace(/#/g, '') : null;
  }

  /** Calcola ID DOM derivati dalla connection. */
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

  /** Invalida cache DOM quando la connection cambia. */
  private clearConnectionElementCache(): void {
    this.svgLineEl = null;
    this.svgRectEl = null;
    this.svgLabelEl = null;
  }

  /** Recupera elementi DOM linea/rect/label usando cache. */
  private getConnectionElements() {
    if (!this.idConnectionClean) this.updateConnectionIds();
    if (!this.idConnectionClean) return { line: null, rect: null, label: null };

    if (!this.svgLineEl) this.svgLineEl = document.getElementById(this.idConnectionClean);
    if (!this.svgRectEl && this.rectId) this.svgRectEl = document.getElementById(this.rectId);
    if (!this.svgLabelEl && this.labelId) this.svgLabelEl = document.getElementById(this.labelId);

    return {
      line: this.svgLineEl,
      rect: this.svgRectEl,
      label: this.svgLabelEl,
    };
  }

  /* -------------------------------------------------------------
   *  Subscriptions
   * ------------------------------------------------------------- */

  /** Sottoscrizione selettiva agli aggiornamenti intent. */
  private initSubscriptions(): void {
    this.intentId$
      .pipe(
        switchMap((intentId) =>
          intentId
            ? this.intentService.intentUpdatesById$(intentId).pipe(
                distinctUntilChanged(
                  (a, b) => a?.intent_display_name === b?.intent_display_name
                )
              )
            : EMPTY
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((intent) => {
        this.intent_display_name = intent.intent_display_name;
        this.cdr.markForCheck();
      });
  }

  /* -------------------------------------------------------------
   *  Connector logic
   * ------------------------------------------------------------- */

  private setIdContractConnector(): void {
    this.setIntentConnector();
    this.getIntentDisplayName();
  }

  private setIntentConnector(): void {
    let display = true;

    if (!this.idConnector) return;

    this.idContractConnector = 'contract_' + this.idConnector;

    const intentId = this.idConnector.split('/')[0];
    const intent = this.intentService.getIntentFromId(intentId);

    if (!intent) return;

    const connectors = intent.attributes?.connectors;

    if (connectors?.[this.idConnector]) {
      this.connector = connectors[this.idConnector];
      display = this.connector.display;

      if (display) {
        this.connectorService.hideDefaultConnector(this.idConnection);
      }
    }

    this.displayConnector = display ? 'none' : 'flex';
  }

  private getIntentDisplayName(): void {
    if (!this.idConnection) return;

    let intentId = this.idConnection.substring(
      this.idConnection.lastIndexOf('/') + 1
    );

    intentId = intentId.replace(/#/g, '');

    const intent = this.intentService.getIntentFromId(intentId);
    if (intent) this.intent_display_name = intent.intent_display_name;
  }

  /* -------------------------------------------------------------
   *  Hover effects
   * ------------------------------------------------------------- */

  /** Evidenzia linea/rect/label del connector. */
  public showConnector(): void {
    this.cachedAlpha = this.stageService.getAlpha() / 100;

    if (!this.idConnection || !this.isConnected) return;

    const { line, rect, label } = this.getConnectionElements();

    if (line) line.setAttribute('opacity', '1');
    if (rect) rect.setAttribute('opacity', '1');
    if (label) label.setAttribute('opacity', '1');
  }

  /** Ripristina opacità standard del connector. */
  public hideConnector(): void {
    if (!this.idConnection || !this.isConnected) return;

    const { line, rect, label } = this.getConnectionElements();

    if (line) line.setAttribute('opacity', this.cachedAlpha.toString());
    if (rect) rect.setAttribute('opacity', '1');
    if (label) label.setAttribute('opacity', '1');
  }

  /* -------------------------------------------------------------
   *  Default / Restore
   * ------------------------------------------------------------- */

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

  /* -------------------------------------------------------------
   *  Navigation
   * ------------------------------------------------------------- */

  public onGoToIntent(event: MouseEvent): void {
    event.stopPropagation();

    if (!this.idConnection) return;

    let intentId = this.idConnection.substring(
      this.idConnection.lastIndexOf('/') + 1
    );

    intentId = intentId.replace(/#/g, '');

    const intent = this.intentService.getIntentFromId(intentId);
    if (!intent) return;

    this.intentService.setIntentSelected(intentId);

    const stageElement = document.getElementById(intentId);
    if (stageElement) {
      const id_faq_kb = this.dashboardService.id_faq_kb;
      this.stageService.centerStageOnElement(id_faq_kb, stageElement);
    }
  }

  public onRestoreConnector(event: MouseEvent): void {
    this.restoreDefaultConnector(event);
  }
}