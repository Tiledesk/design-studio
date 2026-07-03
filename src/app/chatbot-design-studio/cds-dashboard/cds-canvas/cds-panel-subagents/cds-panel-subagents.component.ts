import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { CdsNewSubagentDialogComponent } from './cds-new-subagent-dialog/cds-new-subagent-dialog.component';

interface SubagentItem {
  _id: string;
  name: string;
}

/**
 * Pannello "Subagents" — si apre nello stesso slot sinistro dei Blocks, alternato tramite i tab.
 * Mostra sempre, in ordine: il chatbot PARENT (primo) e i subagent collegati (type=tilebot, subtype=subagent).
 * È visibile sia quando si è sul parent sia quando si è dentro un subagent:
 *  - sul parent: la lista dei subagent si chiede con l'id del chatbot corrente;
 *  - dentro un subagent: la lista (i "fratelli") si chiede con l'id del parent (parent_id).
 * L'elemento correntemente aperto (parent o subagent) è evidenziato. Cliccando un elemento si
 * naviga nella stessa tab. La creazione di nuovi subagent è disabilitata dentro un subagent.
 */
@Component({
  selector: 'cds-panel-subagents',
  templateUrl: './cds-panel-subagents.component.html',
  styleUrls: ['./cds-panel-subagents.component.scss']
})
export class CdsPanelSubagentsComponent implements OnInit {

  @Input() IS_OPEN: boolean;

  parentItem: SubagentItem | null = null;
  subagents: Array<SubagentItem> = [];
  filteredSubagents: Array<SubagentItem> = [];
  searchTerm: string = '';
  isLoading: boolean = false;

  /** id del chatbot correntemente aperto (per l'evidenziazione). */
  currentId: string = '';
  /** true se il chatbot corrente è esso stesso un subagent (nasconde "+ New subagent"). */
  isSubagent: boolean = false;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private dialog: MatDialog,
    private faqKbService: FaqKbService,
    private dashboardService: DashboardService
  ) { }

  ngOnInit(): void {
    this.currentId = this.dashboardService.id_faq_kb;
    const current = this.dashboardService.selectedChatbot;
    this.isSubagent = current?.subtype === 'subagent';
    this.loadData();
  }

  /** Determina parent e lista subagent in base al contesto (parent vs subagent). */
  private loadData(): void {
    const current: any = this.dashboardService.selectedChatbot;
    if (this.isSubagent) {
      // Dentro un subagent: il riferimento per la lista è il parent (parent_id).
      const parentId = current?.parent_id;
      this.loadSubagents(parentId);
      this.loadParent(parentId);
    } else {
      // Sul parent: il parent è il chatbot corrente.
      this.parentItem = { _id: this.currentId, name: current?.name || '' };
      this.loadSubagents(this.currentId);
    }
  }

  /** Carica i subagent collegati a un chatbot parent (endpoint dedicato: /faq_kb/{id}/subagents). */
  private loadSubagents(parentFaqKbId: string): void {
    if (!parentFaqKbId) { return; }
    this.isLoading = true;
    this.faqKbService.getSubagentsByFaqKbId(parentFaqKbId).subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res) ? res : (res?.subagents || res?.data || []);
        this.subagents = list.map((c: any) => ({ _id: c._id, name: c.name }));
        this.applyFilter();
        this.isLoading = false;
        this.logger.log('[CDS-PANEL-SUBAGENTS] subagents loaded:', this.subagents.length);
      },
      error: (error) => {
        this.logger.error('[CDS-PANEL-SUBAGENTS] load error:', error);
        this.isLoading = false;
      }
    });
  }

  /** Recupera nome del parent quando si è dentro un subagent (per mostrarlo come primo elemento). */
  private loadParent(parentId: string): void {
    if (!parentId) { return; }
    this.faqKbService.getBotById(parentId).subscribe({
      next: (res: any) => {
        this.parentItem = { _id: parentId, name: res?.name || '' };
        this.logger.log('[CDS-PANEL-SUBAGENTS] parent loaded:', this.parentItem);
      },
      error: (error) => {
        this.logger.error('[CDS-PANEL-SUBAGENTS] parent load error:', error);
        // fallback: mostra comunque la riga parent con id, senza nome.
        this.parentItem = { _id: parentId, name: '' };
      }
    });
  }

  onSearch(value: string): void {
    this.searchTerm = value ?? '';
    this.applyFilter();
  }

  /**
   * URL della Design Studio del chatbot/subagent.
   * L'app usa hash routing (HashLocationStrategy): es. http://localhost:4200/#/project/{proj}/chatbot/{id}/blocks
   * Manteniamo il base-path corrente (tutto prima di '#') per compatibilità con eventuali deploy sotto sottocartella.
   */
  getSubagentUrl(id: string): string {
    const base = window.location.href.split('#')[0];
    return base + '#/project/' + this.dashboardService.projectID + '/chatbot/' + id + '/blocks';
  }

  /** Apre il chatbot/subagent nella stessa tab (ricarica completa). No-op se è quello già aperto. */
  openAgent(id: string): void {
    if (!id || id === this.currentId) { return; }
    // Cambia solo il fragment (#): impostare href da solo non ricarica → forziamo il reload completo
    // così la Design Studio si re-inizializza sul nuovo agent.
    window.location.href = this.getSubagentUrl(id);
    window.location.reload();
  }

  private applyFilter(): void {
    const f = (this.searchTerm || '').toLowerCase().trim();
    this.filteredSubagents = !f
      ? [...this.subagents]
      : this.subagents.filter(s => (s.name || '').toLowerCase().includes(f));
  }

  /** Apre la modale di creazione (bloccante); al ritorno aggiunge il nuovo agent in lista. */
  onNewSubagent(): void {
    const ref = this.dialog.open(CdsNewSubagentDialogComponent, {
      panelClass: 'cds-new-subagent-dialog-container',
      width: '420px',
      disableClose: true
    });
    ref.afterClosed().subscribe((created: any) => {
      if (created && created._id) {
        this.subagents = [{ _id: created._id, name: created.name }, ...this.subagents];
        this.applyFilter();
        this.logger.log('[CDS-PANEL-SUBAGENTS] subagent added:', created);
      }
    });
  }
}
