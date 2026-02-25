import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';
import { variableList, TYPE_CHATBOT } from 'src/app/chatbot-design-studio/utils-variables';
import { DialogComponent } from '../../../../../../cds-base-element/dialog/dialog.component';

@Component({
  selector: 'variable-list',
  templateUrl: './variable-list.component.html',
  styleUrls: ['./variable-list.component.scss']
})
export class VariableListComponent implements OnInit {

  @Output() onSelected = new EventEmitter();

  type_chatbot: TYPE_CHATBOT;

  variableListUserDefined: { key: string; elements: Array<{ name: string; chatbot_types: string; value: string }> };
  variableListGlobals: { key: string; elements: Array<{ name: string; chatbot_types: string; value: string }> };
  variableListSystemDefined: Array<{ key: string; elements: Array<{ name: string; chatbot_types: string; value: string; description: string; src?: string }> }>;

  filteredVariableList: Array<{ key: string; elements: Array<{ name: string; value: string }> }>;
  filteredGlobalsList: Array<{ key: string; elements: Array<{ name: string; value: string }> }>;
  filteredIntentVariableList: Array<{ key: string; elements: Array<{ name: string; value: string; description: string; src?: string }> }>;
  textVariable: string = '';
  idBot: string;
  isEmpty: boolean = false;
  isSearching: boolean = false;
  BRAND_BASE_INFO = BRAND_BASE_INFO;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public dialog: MatDialog,
    private faqkbService: FaqKbService,
    private dashboardService: DashboardService
  ) { }

  /** Carica liste variabili (user-defined, globals, system) e filtri iniziali. */
  ngOnInit(): void {
    this.initialize();
  }

  ngOnChanges(): void { }

  /** Inizializza liste variabili filtrate per subtype chatbot e costruisce le liste per la vista. */
  private initialize(): void {
    if (
      this.dashboardService.selectedChatbot &&
      Object.values(TYPE_CHATBOT).includes(this.dashboardService.selectedChatbot.subtype as TYPE_CHATBOT)
    ) {
      this.type_chatbot = this.dashboardService.selectedChatbot.subtype as TYPE_CHATBOT;
    } else {
      this.type_chatbot = TYPE_CHATBOT.CHATBOT;
    }
    this.idBot = this.dashboardService.id_faq_kb;
    this.variableListUserDefined = variableList.find(el => el.key === 'userDefined');
    this.logger.log('[VARIABLE-LIST] initialize--> 1', this.type_chatbot, variableList);
    this.variableListGlobals = variableList.find(el => el.key === 'globals');
    this.variableListSystemDefined = variableList
      .filter(el => (el.key !== 'userDefined' && el.key !== 'globals'))
      .map(el => ({
      ...el,
      elements: el.elements.filter(elem => elem.chatbot_types?.includes(this.type_chatbot))
    }));

    this.filteredVariableList = [];
    this.filteredGlobalsList = [];
    this.filteredIntentVariableList = [];
    if (this.variableListUserDefined) {
      this.filteredVariableList.push({ key: this.variableListUserDefined.key, elements: this.sortElementsByName(this.variableListUserDefined.elements || []) });
    }
    if (this.variableListGlobals) {
      this.filteredGlobalsList.push({ key: this.variableListGlobals.key, elements: this.sortElementsByName(this.variableListGlobals.elements || []) });
    }
    variableList.filter(el => (el.key !== 'userDefined' && el.key !== 'globals')).forEach(el => {
      this.filteredIntentVariableList.push({ key: el.key, elements: this.sortElementsByName(el.elements || []) });
    });
  }

  /** Apre dialog per aggiungere attributo custom; al salvataggio aggiunge alla lista e persiste. */
  openDialog(): void {
    const that = this;
    const dialogRef = this.dialog.open(DialogComponent, {
      panelClass: 'custom-dialog-container',
      data: {text: ''}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result !== undefined && result !== false) {
        const variable = { name: result, chatbot_types: this.type_chatbot, value: result };
        that.variableListUserDefined.elements.push(variable);
        this.saveVariables(this.variableListUserDefined.elements);
      }
    });
  }

  /** Rimuove una variabile user-defined dalla lista e persiste. */
  onVariableDelete(variableSelected: { name: string; value: string }): void {
    const index = this.variableListUserDefined.elements.findIndex(el => el.name === variableSelected.name);
    if (index > -1) {
      this.variableListUserDefined.elements.splice(index, 1);
      this.saveVariables(this.variableListUserDefined.elements);
    }
  }

  /** Persiste le variabili user-defined sul backend. */
  private saveVariables(variables: Array<{ name: string }>): void {
    const jsonVar: Record<string, string> = {};
    variables.forEach(element => {
      jsonVar[element.name] = element.name;
    });
    this.faqkbService.addNodeToChatbotAttributes(this.idBot, 'variables', jsonVar).subscribe(
      () => { },
      () => { }
    );
  }

  /** Notifica al parent la variabile selezionata. */
  onVariableSelected(variableSelected: { name: string; value: string }): void {
    this.onSelected.emit(variableSelected);
  }

  /** Filtra le liste variabili in base al testo di ricerca e aggiorna isEmpty/isSearching. */
  onChangeSearch(event: string | { target?: { value?: string } }): void {
    const value = typeof event === 'string' ? event : (event?.target?.value ?? '');
    this.textVariable = value;
    this.filteredVariableList = this._filter2(value, this.variableListUserDefined ? [this.variableListUserDefined] : []);
    this.filteredGlobalsList = this._filter2(value, this.variableListGlobals ? [this.variableListGlobals] : []);
    this.filteredIntentVariableList = this._filter2(value, this.variableListSystemDefined || []);
    const hasUserDefined = this.filteredVariableList?.length > 0 && this.filteredVariableList[0]?.elements?.length > 0;
    this.isEmpty = (this.filteredIntentVariableList.every(el => el.elements.length === 0) && !hasUserDefined);
    this.isSearching = (value !== '');
  }

  /** Filtra e ordina per nome gli elementi di ogni gruppo della lista. */
  private _filter2(value: string, array: Array<{ key: string; elements: Array<any> }>): Array<any> {
    const filterValue = value.toLowerCase();
    return array.map(el => {
      const filtered = el.elements.filter(option => option.name.toLowerCase().includes(filterValue));
      const sorted = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return { key: el.key, elements: sorted };
    });
  }

  /** Ordina gli elementi per nome (usato per liste variabili). */
  private sortElementsByName<T extends { name?: string }>(elements: T[]): T[] {
    return elements.length ? [...elements].sort((a, b) => (a.name || '').localeCompare(b.name || '')) : elements;
  }

  /** Apre il dialog per aggiungere un attributo custom. */
  onAddCustomAttribute(): void {
    this.openDialog();
  }

  /** trackBy per *ngFor sulle variabili (stabilizza il render). */
  trackByVariableName(index: number, variable: { name?: string; value?: string }): string | number {
    return variable?.name ?? variable?.value ?? index;
  }

  /** trackBy per *ngFor sugli item intent (stabilizza il render). */
  trackByIntentItemKey(index: number, item: { key?: string }): string | number {
    return item?.key ?? index;
  }

}
