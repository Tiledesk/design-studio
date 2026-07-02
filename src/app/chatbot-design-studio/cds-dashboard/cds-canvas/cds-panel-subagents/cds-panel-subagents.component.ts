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
 * Mostra i subagent del chatbot corrente (type=tilebot, subtype=subagent, parent_id=chatbot principale)
 * e permette di crearne di nuovi (modale bloccante).
 */
@Component({
  selector: 'cds-panel-subagents',
  templateUrl: './cds-panel-subagents.component.html',
  styleUrls: ['./cds-panel-subagents.component.scss']
})
export class CdsPanelSubagentsComponent implements OnInit {

  @Input() IS_OPEN: boolean;

  subagents: Array<SubagentItem> = [];
  filteredSubagents: Array<SubagentItem> = [];
  searchTerm: string = '';
  isLoading: boolean = false;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private dialog: MatDialog,
    private faqKbService: FaqKbService,
    private dashboardService: DashboardService
  ) { }

  ngOnInit(): void {
    this.loadSubagents();
  }

  /** Carica i subagent collegati al chatbot corrente (endpoint dedicato: /faq_kb/{id}/subagents). */
  loadSubagents(): void {
    this.isLoading = true;
    const faqKbId = this.dashboardService.id_faq_kb;
    this.faqKbService.getSubagentsByFaqKbId(faqKbId).subscribe({
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

  onSearch(value: string): void {
    this.searchTerm = value ?? '';
    this.applyFilter();
  }

  /** URL della pagina di dettaglio (design studio) del subagent, da aprire in una nuova tab. */
  getSubagentUrl(subagentId: string): string {
    const currentId = this.dashboardService.id_faq_kb;
    const href = window.location.href;
    // Robusto: sostituisce l'id del chatbot corrente nell'URL (route project/:projectid/chatbot/:faqkbid).
    if (currentId && subagentId && href.includes(currentId)) {
      return href.replace(currentId, subagentId);
    }
    // Fallback sulla route.
    return window.location.origin + '/project/' + this.dashboardService.projectID + '/chatbot/' + subagentId;
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
