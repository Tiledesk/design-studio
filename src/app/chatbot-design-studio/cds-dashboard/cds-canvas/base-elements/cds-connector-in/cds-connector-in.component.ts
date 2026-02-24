import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { Subscription } from 'rxjs';

import { Intent } from 'src/app/models/intent-model';
import { ConnectorService } from 'src/app/chatbot-design-studio/services/connector.service';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { DashboardService } from 'src/app/services/dashboard.service';

@Component({
  selector: 'cds-connector-in',
  templateUrl: './cds-connector-in.component.html',
  styleUrls: ['./cds-connector-in.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CdsConnectorInComponent implements OnInit, OnChanges, OnDestroy {

  /* --------------------------------------------------------------------------
   * Inputs
   * -------------------------------------------------------------------------- */

  /** Lista completa dei connector "in" (in ingresso) ricevuti dal parent. */
  @Input() connectorsIn: any[] = [];

  /* --------------------------------------------------------------------------
   * Stato derivato (usato nel template)
   * -------------------------------------------------------------------------- */

  /** Connector filtrati (solo quelli con contract visibile). */
  connectorsInFiltered: any[] = [];

  /** Etichetta numerica visualizzata sul badge (es. "3", "+9"). */
  labelNumber: string;

  /**
   * Lista di intent collegati, raggruppati per intent sorgente:
   * - intent: l’intent sorgente
   * - connectorIds: tutti i connector che partono da quell’intent
   */
  connectedIntents: Array<{ intent: Intent; connectorIds: string[] }> = [];

  /**
   * True quando il mouse è sul container o sul menu;
   * usato per [class.is-hidden] (evita toggle su display dal TS).
   */
  menuVisible = false;

  /* --------------------------------------------------------------------------
   * Subscription / cache (interno)
   * -------------------------------------------------------------------------- */

  private subscriptionChangedConnectorAttributes: Subscription;

  /**
   * Cache elementi DOM (linea, rect, label) per connector.
   * Viene invalidata quando cambia connectorsInFiltered.
   */
  private connectorElementsCache: Array<{
    line: HTMLElement | null;
    rect: HTMLElement | null;
    label: HTMLElement | null;
  }> = [];

  /**
   * Alpha (0-1) per opacità linee; aggiornato in showConnectorsIn,
   * riusato in hideConnectorsIn e onMenuItemMouseLeave.
   */
  private cachedAlpha = 0;

  constructor(
    private readonly intentService: IntentService,
    private readonly stageService: StageService,
    private readonly dashboardService: DashboardService,
    private readonly connectorService: ConnectorService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  /* --------------------------------------------------------------------------
   * Lifecycle
   * -------------------------------------------------------------------------- */

  ngOnInit(): void {
    this.cachedAlpha = this.stageService.getAlpha() / 100;

    this.initializeConnectors();
    this.subscribeToChangedConnectorAttributes();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Se cambiano i connectors in ingresso, ricalcolo tutto.
    if (changes['connectorsIn'] && !changes['connectorsIn'].firstChange) {
      this.initializeConnectors();
    }
  }

  ngOnDestroy(): void {
    // Chiude la subscription per evitare memory leak.
    this.subscriptionChangedConnectorAttributes?.unsubscribe();
  }

  /* --------------------------------------------------------------------------
   * Template helpers
   * -------------------------------------------------------------------------- */

  /** trackBy per rendere più stabile il rendering della lista menu. */
  trackByIntentId(_index: number, item: { intent: Intent; connectorIds: string[] }): string {
    return item?.intent?.intent_id ?? '';
  }

  /* --------------------------------------------------------------------------
   * Subscriptions
   * -------------------------------------------------------------------------- */

  /**
   * Ascolta quando cambiano attributi dei connector.
   * Se il connector emesso appartiene ai connectorsIn, aggiorna i dati del menu.
   */
  private subscribeToChangedConnectorAttributes(): void {
    this.subscriptionChangedConnectorAttributes =
      this.connectorService.observableChangedConnectorAttributes.subscribe((connector: any) => {
        const emittedId = connector?.id;
        if (emittedId && this.connectorsIn.some((c) => c.id === emittedId)) {
          this.initializeConnectors();
        }
      });
  }

  /* --------------------------------------------------------------------------
   * Inizializzazione & calcoli derivati
   * -------------------------------------------------------------------------- */

  /**
   * Inizializza lo stato derivato:
   * - filtra i connettori
   * - calcola labelNumber
   * - costruisce la lista connectedIntents (raggruppata e ordinata)
   */
  private initializeConnectors(): void {
    this.filterConnectorsWithVisibleContract();

    this.labelNumber = this.connectorsInFiltered.length.toString();
    if (this.connectorsInFiltered.length > 9) {
      this.labelNumber = '+9';
    }

    this.loadConnectedIntents();
    this.cdr.markForCheck();
  }

  /**
   * Restituisce l'id dell'elemento DOM contract per un connector
   * (connectorId senza ultimo segmento).
   */
  private getContractElementId(connectorId: string): string {
    const withoutLastSegment = connectorId.split('/').slice(0, -1).join('/');
    return withoutLastSegment ? 'contract_' + withoutLastSegment : '';
  }

  /**
   * Filtra i connettori mantenendo solo quelli che hanno un contract connector visibile.
   * Usa una cache per ciclo per evitare getElementById + style.display ripetuti.
   */
  private filterConnectorsWithVisibleContract(): void {
    this.clearConnectorElementsCache();

    const visibilityByContractId = new Map<string, boolean>();
    this.connectorsInFiltered = this.connectorsIn.filter((connector) => {
      return this.hasVisibleContractConnector(connector.id, visibilityByContractId);
    });
  }

  private clearConnectorElementsCache(): void {
    this.connectorElementsCache = [];
  }

  /**
   * Restituisce gli elementi DOM (linea, rect, label) per ogni connector filtrato,
   * usando cache e popolandola al primo utilizzo.
   */
  private getConnectorElements(): Array<{ line: HTMLElement | null; rect: HTMLElement | null; label: HTMLElement | null }> {
    if (!this.connectorsInFiltered?.length) return [];

    if (this.connectorElementsCache.length !== this.connectorsInFiltered.length) {
      this.connectorElementsCache = this.connectorsInFiltered.map((connector) => {
        const id = connector.id?.replace(/#/g, '') ?? '';
        return {
          line: document.getElementById(id),
          rect: document.getElementById('rect_' + id),
          label: document.getElementById('label_' + id)
        };
      });
    }

    return this.connectorElementsCache;
  }

  /**
   * Verifica se un connettore ha un contract connector visibile.
   * @param connectorId ID completo del connettore
   * @param cache cache opzionale (per ciclo di filtro)
   */
  private hasVisibleContractConnector(connectorId: string, cache?: Map<string, boolean>): boolean {
    const contractId = this.getContractElementId(connectorId);
    if (!contractId) return false;

    if (cache?.has(contractId)) return cache.get(contractId)!;

    const el = document.getElementById(contractId);
    const visible = el ? el.style.display !== 'none' : false;

    cache?.set(contractId, visible);
    return visible;
  }

  /**
   * Costruisce la lista degli intent sorgente collegati, raggruppando connectorIds per intent.
   * Ordina per nome intent (case-insensitive).
   */
  private loadConnectedIntents(): void {
    this.connectedIntents = [];

    if (!this.connectorsInFiltered || this.connectorsInFiltered.length === 0) {
      return;
    }

    const intentMap = new Map<string, { intent: Intent; connectorIds: string[] }>();

    this.connectorsInFiltered.forEach((connector) => {
      if (!connector.id) return;

      // Formato: {fromIntentId}/{actionId}/.../{toIntentId}
      const segments = connector.id.split('/');
      if (segments.length === 0) return;

      const fromIntentId = segments[0];

      if (!intentMap.has(fromIntentId)) {
        const intent = this.intentService.getIntentFromId(fromIntentId);
        if (intent) {
          intentMap.set(fromIntentId, { intent, connectorIds: [connector.id] });
        }
        return;
      }

      // Aggiunge il connectorId all’array esistente
      intentMap.get(fromIntentId)!.connectorIds.push(connector.id);
    });

    this.connectedIntents = Array.from(intentMap.values()).sort((a, b) => {
      const nameA = a.intent.intent_display_name?.toLowerCase() || '';
      const nameB = b.intent.intent_display_name?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });
  }

  /* --------------------------------------------------------------------------
   * UI events (hover + menu)
   * -------------------------------------------------------------------------- */

  /** Hover sul badge: mostra il menu e evidenzia le linee dei connector. */
  public showConnectorsIn(event: MouseEvent): void {
    event.stopPropagation();

    this.menuVisible = true;
    this.cachedAlpha = this.stageService.getAlpha() / 100;

    const elements = this.getConnectorElements();
    elements.forEach(({ line, rect, label }) => {
      if (line) line.setAttribute('opacity', '1');
      if (rect) rect.setAttribute('opacity', '1');
      if (label) label.setAttribute('opacity', '1');
    });

    this.cdr.markForCheck();
  }

  /** Mouse leave dal badge: nasconde menu e ripristina opacità originale. */
  public hideConnectorsIn(event: MouseEvent): void {
    event.stopPropagation();

    this.menuVisible = false;

    const elements = this.getConnectorElements();
    elements.forEach(({ line, rect, label }) => {
      if (line) line.setAttribute('opacity', this.cachedAlpha.toString());
      if (rect) rect.setAttribute('opacity', this.cachedAlpha.toString());
      if (label) label.setAttribute('opacity', this.cachedAlpha.toString());
    });

    this.cdr.markForCheck();
  }

  /* --------------------------------------------------------------------------
   * Navigation
   * -------------------------------------------------------------------------- */

  /** Click su una voce menu: seleziona intent e centra lo stage su quell’elemento. */
  public onGoToIntent(event: MouseEvent, intent: Intent): void {
    event.stopPropagation();

    if (intent && intent.intent_id) {
      this.intentService.setIntentSelected(intent.intent_id);

      // Centra lo stage sull’intent selezionato (stessa animazione di cds-panel-intent-list)
      const stageElement = document.getElementById(intent.intent_id);
      if (stageElement) {
        const id_faq_kb = this.dashboardService.id_faq_kb;
        this.stageService.centerStageOnElement(id_faq_kb, stageElement);
      }
    }
  }

  /* --------------------------------------------------------------------------
   * Menu item hover (highlight singoli connector)
   * -------------------------------------------------------------------------- */

  public onMenuItemMouseEnter(connectorIds: string[]): void {
    const contractVisibilityCache = new Map<string, boolean>();

    connectorIds.forEach((connectorId) => {
      const svgElement = document.getElementById(connectorId?.replace(/#/g, ''));
      if (svgElement) {
        svgElement.setAttribute('class', 'tds_connector_over');
        svgElement.setAttribute('marker-start', 'url(#tds_arrow_over)');
        svgElement.setAttribute('opacity', '1');
      }

      if (this.hasVisibleContractConnector(connectorId, contractVisibilityCache)) {
        this.connectorService.showDefaultConnector(connectorId);
      }
    });
  }

  public onMenuItemMouseLeave(connectorIds: string[]): void {
    const contractVisibilityCache = new Map<string, boolean>();

    connectorIds.forEach((connectorId) => {
      const svgElement = document.getElementById(connectorId?.replace(/#/g, ''));
      if (svgElement) {
        svgElement.setAttribute('class', 'tds_connector');

        const originalMarkerId = `marker_${connectorId}`;
        svgElement.setAttribute('marker-start', `url(#${originalMarkerId})`);

        const menuElement = document.querySelector('.connector-in-menu:hover');
        if (!menuElement) {
          svgElement.setAttribute('opacity', this.cachedAlpha.toString());
        }
      }

      if (this.hasVisibleContractConnector(connectorId, contractVisibilityCache)) {
        this.connectorService.hideDefaultConnector(connectorId);
      }
    });
  }
}