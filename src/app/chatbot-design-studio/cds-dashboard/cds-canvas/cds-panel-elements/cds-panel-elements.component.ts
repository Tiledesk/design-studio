import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { TYPE_OF_MENU } from '../../../utils';
import { TYPE_CHATBOT, ACTIONS_LIST, TYPE_ACTION_CATEGORY, ACTION_CATEGORY, isSubagentSubtype, resolveChatbotSubtype, isActionAvailableInSubagentContext } from 'src/app/chatbot-design-studio/utils-actions';
import { ProjectPlanUtils } from 'src/app/utils/project-utils';
import { TranslateService } from '@ngx-translate/core';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { DashboardService } from 'src/app/services/dashboard.service';


import { LeftPanelStateService } from '../../../services/left-panel-state.service';
@Component({
  selector: 'cds-panel-elements',
  templateUrl: './cds-panel-elements.component.html',
  styleUrls: ['./cds-panel-elements.component.scss']
  // standalone: true,
  // imports: [MatButtonModule, MatMenuModule],
})
export class CdsPanelElementsComponent implements OnInit {
  @ViewChild('menuTrigger') menuTrigger: MatMenuTrigger;
  @ViewChild('menuElement', { static: false }) private menuElement: ElementRef;


    /** La lista che riceve i rilasci sullo stage, da collegare alla tavolozza. */
  @Input() stageDropListId: string;

@Output() addNewElement = new EventEmitter();
  // @Output() showPanelActions = new EventEmitter();
  @Output() onMouseOverActionMenuSx = new EventEmitter();
  @Output() hideActionPlaceholderOfActionPanel = new EventEmitter();
  isDraggingMenuElement: boolean = false;
  TYPE_OF_MENU = TYPE_OF_MENU;

  TYPE_ACTION_CATEGORY = TYPE_ACTION_CATEGORY;
  ACTION_CATEGORY = ACTION_CATEGORY;
  // Il menu a comparsa che si apriva passando sulle categorie non esiste piu': la tavolozza e'
  // un pannello, e le categorie si aprono al suo interno. Con lui se ne sono andati i campi che
  // ne tenevano posizione e stato, e i cinque metodi che li muovevano.

  actionsByCategory = {};
  
  private readonly logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private readonly projectPlanUtils: ProjectPlanUtils,
    private readonly dashboardService: DashboardService,
    private readonly translate: TranslateService,
    private readonly leftPanelState: LeftPanelStateService
  ) { }

  ngOnInit(): void {
    this.createActionListByCategory();
  }

  onHideActionPlaceholderOfActionPanel(event) {
    this.hideActionPlaceholderOfActionPanel.emit(event)
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
    const isSubagent = isSubagentSubtype(subtype);
    this.logger.log('[CDS-PANEL-ELEMENTS] subtype:: ', ACTIONS_LIST, subtype, 'isSubagent:', isSubagent);
    // subtype normalizzato: un subagent è a tutti gli effetti un chatbot, altrimenti
    // checkIfActionIsInChatbotType disattiverebbe ogni azione (nessuna dichiara 'subagent')
    this.projectPlanUtils.checkIfActionIsInChatbotType(resolveChatbotSubtype(subtype));
    ACTION_CATEGORY.forEach(category => {
      let menuItemsList = Object.values(ACTIONS_LIST).filter(el => (el.category === TYPE_ACTION_CATEGORY[category.type] && el.status !== 'inactive' && isActionAvailableInSubagentContext(el, isSubagent))).map(element => {
        return {
          type: TYPE_OF_MENU.ACTION,
          value: element,
          canLoad: element.plan? this.projectPlanUtils.checkIfCanLoad(element.type, element.plan) : true
        };
      });
      if(menuItemsList.length>0){
        this.actionsByCategory[category.type] = menuItemsList;
      }
      this.logger.log('[CDS-PANEL-ELEMENTS] menuItemsList:: ', category.type, menuItemsList);
    });
    this.logger.log('[CDS-PANEL-ELEMENTS] actionsByCategory:: ', this.actionsByCategory);
    this.openFirstCategory();
  }

}
