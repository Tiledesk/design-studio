import { Component, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';
import { TYPE_OF_MENU } from '../../../utils';
import { TYPE_CHATBOT, ACTIONS_LIST, TYPE_ACTION_CATEGORY, ACTION_CATEGORY, isSubagentSubtype, resolveChatbotSubtype, availableActionEntries, getKeyByValue } from 'src/app/chatbot-design-studio/utils-actions';
import { ProjectPlanUtils } from 'src/app/utils/project-utils';
import { TranslateService } from '@ngx-translate/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { DashboardService } from 'src/app/services/dashboard.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ConnectorCatalogService, ConnectorGroup } from '../../../connector/connector-catalog.service';
import { ProjectService } from 'src/app/services/projects.service';
import { environment } from 'src/environments/environment';
import { ReadOnlyService } from 'src/app/services/read-only.service';
import { buildStartPointItems, presentStartPointTypes } from 'src/app/chatbot-design-studio/utils-start-points';


import { LeftPanelStateService } from '../../../services/left-panel-state.service';

const START_POINTS_CATEGORY = 'START_POINTS';

@Component({
  selector: 'cds-panel-elements',
  templateUrl: './cds-panel-elements.component.html',
  styleUrls: ['./cds-panel-elements.component.scss']
  // standalone: true,
  // imports: [MatButtonModule, MatMenuModule],
})
export class CdsPanelElementsComponent implements OnInit, OnChanges {


  /** blocks of the flow: a block carrying a start point marker makes that start point present */
  @Input() intents: Array<any> = [];
  /** true while a start box is being created: its palette item stays disabled */
  @Input() startPointPending: boolean = false;
  @Output() focusStartPoint = new EventEmitter<string>();
  @Output() addNewElement = new EventEmitter();
  // @Output() showPanelActions = new EventEmitter();
  @Output() onMouseOverActionMenuSx = new EventEmitter();
  isDraggingMenuElement: boolean = false;
  TYPE_OF_MENU = TYPE_OF_MENU;

  TYPE_ACTION_CATEGORY = TYPE_ACTION_CATEGORY;
  ACTION_CATEGORY = ACTION_CATEGORY;
  // Il menu a comparsa che si apriva passando sulle categorie non esiste piu': la tavolozza e'
  // un pannello, e le categorie si aprono al suo interno. Con lui se ne sono andati i campi che
  // ne tenevano posizione e stato, e i cinque metodi che li muovevano.
  //
  // menuCategory holds the enum KEY (ACTION_CATEGORY[].type === getKeyByValue(...)), not the value.
  INTEGRATIONS_CATEGORY_KEY = getKeyByValue(TYPE_ACTION_CATEGORY.INTEGRATIONS, TYPE_ACTION_CATEGORY);

  actionsByCategory = {};
  connectorGroups: ConnectorGroup[] = [];


  private readonly logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private readonly projectPlanUtils: ProjectPlanUtils,
    private readonly dashboardService: DashboardService,
    private readonly translate: TranslateService,
    private readonly leftPanelState: LeftPanelStateService,
    private readonly connectorCatalogService: ConnectorCatalogService,
    private readonly projectService: ProjectService,
    private readonly readOnlyService: ReadOnlyService,
  ) { }

  ngOnInit(): void {
    this.createActionListByCategory();
    this.loadConnectorActions();
    this.loadConfiguredConnectors();
  }

  ngOnChanges(): void {
    // Le voci dei punti di partenza dicono quali esistono gia' nel flusso e se ce n'e' uno in
    // creazione: vanno rifatte quando il flusso cambia. Prima questo valeva per il menu aperto,
    // che qui non c'e' piu': la sezione vive nell'elenco, e si aggiorna li'.
    if (this.actionsByCategory[START_POINTS_CATEGORY]) {
      this.actionsByCategory[START_POINTS_CATEGORY] = this.buildStartPointItems();
    }
  }

  buildStartPointItems(): Array<any> {
    // Sola lettura: nessun box di partenza si aggiunge, le voci restano disabilitate
    return buildStartPointItems(presentStartPointTypes(this.intents), this.startPointPending || this.readOnlyService.readOnly);
  }

  onStartPointClick(type: string) {
    this.focusStartPoint.emit(type);
  }


  onDraggingMenuElement(event) {
    this.isDraggingMenuElement = event;
  }


  

  // onMouseOverElement(e){
  //   // let pos = {'x': e.target.offsetLeft+e.target.offsetWidth+20, 'y': e.target.offsetTop+12 }
  //   // this.showPanelActions.emit(pos);
  // }

  // onMouseLeaveElement(e){
  //   // let pos = {'x': -100, 'y': -100 }
  //   // this.showPanelActions.emit(pos);
  // }







  /** Chiude il pannello di sinistra, come la freccia del pannello dei blocchi. Passa dallo
   *  stato condiviso, lo stesso che muovono le linguette. */
  onClosePanel(): void {
    this.leftPanelState.close();
  }

  /** Testo cercato; vuoto significa nessun filtro. */
  searchText: string = '';

  /** Le categorie aperte. La prima che ha azioni si apre da sola: un pannello che si apre
   *  tutto chiuso costringe a un clic in piu' per vedere qualunque cosa. */
  private openCategories = new Set<string>();

  /** Le azioni di una categoria che passano il filtro, gia' pronte per il pannello.
   *
   *  Il confronto e' sull'etichetta tradotta e non sulla chiave: chi cerca "risposta" non sa
   *  che dentro si chiama `reply`. */
  visibleActions(categoryType: string): Array<any> {
    const all = this.actionsByCategory[categoryType] || [];
    const needle = (this.searchText || '').trim().toLowerCase();
    if (!needle) { return all; }
    return all.filter(item => {
      const key = item?.value?.name || '';
      let label = key;
      try { label = this.translate.instant(key) || key; } catch (e) { /* chiave senza traduzione */ }
      return String(label).toLowerCase().includes(needle) || String(key).toLowerCase().includes(needle);
    });
  }

  hasAnyVisible(): boolean {
    return ACTION_CATEGORY.some(c => this.visibleActions(c.type).length > 0);
  }

  isCategoryOpen(categoryType: string): boolean {
    // Cercando si aprono tutte: nascondere i risultati dietro un clic vanificherebbe la ricerca.
    if ((this.searchText || '').trim()) { return true; }
    return this.openCategories.has(categoryType);
  }

  toggleCategory(categoryType: string): void {
    if (this.openCategories.has(categoryType)) { this.openCategories.delete(categoryType); }
    else { this.openCategories.add(categoryType); }
  }

  onSearchChange(): void { /* il filtro e' letto dal template: qui non serve altro */ }

  clearSearch(): void { this.searchText = ''; }

  /** Apre la prima categoria che ha qualcosa da mostrare. */
  private openFirstCategory(): void {
    const first = ACTION_CATEGORY.find(c => (this.actionsByCategory[c.type] || []).length > 0);
    if (first) { this.openCategories.add(first.type); }
  }

  createActionListByCategory(){
    const subtype = this.dashboardService.selectedChatbot.subtype?this.dashboardService.selectedChatbot.subtype:TYPE_CHATBOT.CHATBOT;
    this.logger.log('[CDS-PANEL-ELEMENTS] subtype:: ', ACTIONS_LIST, subtype, 'isSubagent:', isSubagentSubtype(subtype));
    // subtype normalizzato: un subagent è a tutti gli effetti un chatbot, altrimenti
    // checkIfActionIsInChatbotType disattiverebbe ogni azione (nessuna dichiara 'subagent')
    this.projectPlanUtils.checkIfActionIsInChatbotType(resolveChatbotSubtype(subtype));
    // The same filter get_project_capabilities answers the agent chat with.
    const available = availableActionEntries(subtype,
      (type, plan) => this.projectPlanUtils.checkIfCanLoad(type, plan));
    ACTION_CATEGORY.forEach(category => {
      if (category.type === START_POINTS_CATEGORY) {
        // start points are not actions: only conversational chatbots have them
        if (subtype === TYPE_CHATBOT.CHATBOT) {
          this.actionsByCategory[category.type] = this.buildStartPointItems();
        }
        return;
      }
      let menuItemsList = available
        .filter(a => a.entry.category === TYPE_ACTION_CATEGORY[category.type])
        .map(a => ({ type: TYPE_OF_MENU.ACTION, value: a.entry, canLoad: a.canLoad }));
      if(menuItemsList.length>0){
        this.actionsByCategory[category.type] = menuItemsList;
      }
      this.logger.log('[CDS-PANEL-ELEMENTS] menuItemsList:: ', category.type, menuItemsList);
    });
    this.logger.log('[CDS-PANEL-ELEMENTS] actionsByCategory:: ', this.actionsByCategory);
    this.openFirstCategory();
  }

  loadConnectorActions() {
    const projectId = this.dashboardService.projectID;
    if (!projectId) { return; }
    this.projectService.getIntegrations(projectId).pipe(
      catchError(() => of(null))
    ).subscribe((integrations: any) => {
      this.connectorCatalogService.getInstalledConnectorEntries(integrations).forEach(({ baseUrl }) => {
        this.connectorCatalogService.fetchManifest(baseUrl).pipe(
          catchError(() => of(null))
        ).subscribe(manifest => {
          if (!manifest) { return; }
          const group = this.connectorCatalogService.toConnectorGroup(manifest);
          if (!group.entries || group.entries.length === 0) { return; }
          this.connectorGroups = [...this.connectorGroups.filter(g => g.id !== group.id), group];
        });
      });
    });
  }

  // TEMP: surface connectors from a statically configured base URL (environment.connectorBaseUrls)
  // until the per-project install / integration-record flow exists. Feeds the same connectorGroups
  // as loadConnectorActions(); dedupe-by-id keeps it from doubling once the dynamic path is live.
  loadConfiguredConnectors() {
    const urls: string[] = (environment as any).connectorBaseUrls || [];
    urls.forEach((baseUrl: string) => {
      if (!baseUrl) { return; }
      this.connectorCatalogService.fetchManifest(baseUrl).pipe(
        catchError(() => of(null))
      ).subscribe(manifest => {
        if (!manifest) { return; }
        const group = this.connectorCatalogService.toConnectorGroup(manifest);
        if (!group.entries || group.entries.length === 0) { return; }
        this.connectorGroups = [...this.connectorGroups.filter(g => g.id !== group.id), group];
      });
    });
  }

}
