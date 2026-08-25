import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuTrigger } from '@angular/material/menu';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { CdsNewSubagentDialogComponent } from './cds-new-subagent-dialog/cds-new-subagent-dialog.component';
import { TranslateService } from '@ngx-translate/core';
import { DialogYesNoComponent } from 'src/app/chatbot-design-studio/cds-base-element/dialog-yes-no/dialog-yes-no.component';

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
export class CdsPanelSubagentsComponent implements OnInit, OnDestroy {

  @Input() IS_OPEN: boolean;

  parentItem: SubagentItem | null = null;
  subagents: Array<SubagentItem> = [];
  filteredSubagents: Array<SubagentItem> = [];
  searchTerm: string = '';
  isLoading: boolean = false;
  /** guardia anti doppio-invio mentre la DELETE e' in volo. */
  isDeleting: boolean = false;

  /** ritardo di chiusura del menu azioni dopo che il mouse ne esce. */
  private readonly MENU_CLOSE_DELAY_MS = 1000;
  private menuCloseTimer: any = null;
  private openMenuTrigger: MatMenuTrigger | null = null;

  /** id del chatbot correntemente aperto (per l'evidenziazione). */
  currentId: string = '';
  /** true se il chatbot corrente è esso stesso un subagent (nasconde "+ New subagent"). */
  isSubagent: boolean = false;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private dialog: MatDialog,
    private faqKbService: FaqKbService,
    private dashboardService: DashboardService,
    private translate: TranslateService
  ) { }

  ngOnDestroy(): void {
    this.clearMenuCloseTimer();
  }

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

  /**
   * Riporta la Design Studio sul parent ricaricandola da zero.
   * A differenza di openAgent() non ha la guardia "stesso id": se siamo gia' sul parent
   * l'href non cambia, ma il reload deve avvenire comunque per rileggere il flusso.
   */
  private goToParentAndReload(): void {
    const parentId = this.parentItem?._id;
    if (parentId) {
      window.location.href = this.getSubagentUrl(parentId);
    }
    window.location.reload();
  }

  private applyFilter(): void {
    const f = (this.searchTerm || '').toLowerCase().trim();
    this.filteredSubagents = !f
      ? [...this.subagents]
      : this.subagents.filter(s => (s.name || '').toLowerCase().includes(f));
  }

  /**
   * Apre la modale di creazione (bloccante); a creazione riuscita la Design Studio si
   * ricarica direttamente SUL subagent appena creato, pronto per essere modificato.
   * Non serve aggiornare la lista in memoria: la pagina viene ricaricata da zero.
   */
  onNewSubagent(): void {
    const ref = this.dialog.open(CdsNewSubagentDialogComponent, {
      panelClass: 'cds-new-subagent-dialog-container',
      width: '420px',
      disableClose: true
    });
    ref.afterClosed().subscribe((created: any) => {
      if (created && created._id) {
        this.logger.log('[CDS-PANEL-SUBAGENTS] subagent added:', created);
        this.openAgent(created._id);
      }
    });
  }

  /** Mouse sul bottone o sul pannello: annulla l'eventuale chiusura pendente e apre il menu. */
  onSubagentMenuEnter(trigger: MatMenuTrigger): void {
    this.clearMenuCloseTimer();
    // un solo menu alla volta: passando su un'altra riga chiudo quello rimasto aperto
    if (this.openMenuTrigger && this.openMenuTrigger !== trigger) {
      this.openMenuTrigger.closeMenu();
    }
    this.openMenuTrigger = trigger;
    trigger.openMenu();
  }

  /** Mouse fuori: chiude dopo MENU_CLOSE_DELAY_MS, cosi' c'e' tempo di raggiungere il pannello. */
  onSubagentMenuLeave(trigger: MatMenuTrigger): void {
    this.clearMenuCloseTimer();
    this.menuCloseTimer = setTimeout(() => {
      this.menuCloseTimer = null;
      trigger.closeMenu();
      if (this.openMenuTrigger === trigger) { this.openMenuTrigger = null; }
    }, this.MENU_CLOSE_DELAY_MS);
  }

  private clearMenuCloseTimer(): void {
    if (this.menuCloseTimer) {
      clearTimeout(this.menuCloseTimer);
      this.menuCloseTimer = null;
    }
  }

  private closeSubagentMenu(): void {
    this.clearMenuCloseTimer();
    this.openMenuTrigger?.closeMenu();
    this.openMenuTrigger = null;
  }

  /**
   * Voce "Delete" del menu: chiede conferma e, solo se confermata, elimina.
   * stopPropagation perche' il click non deve far navigare la riga sottostante.
   */
  onDeleteSubagent(sa: SubagentItem, event?: Event): void {
    event?.stopPropagation();
    this.closeSubagentMenu();
    if (!sa?._id || this.isDeleting) { return; }
    const ref = this.dialog.open(DialogYesNoComponent, {
      panelClass: 'custom-dialog-container',
      disableClose: true,
      data: {
        title: this.translate.instant('CDSCanvas.DeleteSubagentTitle'),
        text: this.translate.instant('CDSCanvas.DeleteSubagentText', { name: sa.name }),
        yes: this.translate.instant('Delete'),
        no: this.translate.instant('Cancel')
      }
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed === true) { this.deleteSubagent(sa); }
    });
  }

  /**
   * Elimina il subagent. A cancellazione riuscita la Design Studio viene SEMPRE ricaricata
   * sul parent: non basta togliere la riga dalla lista, perche' il flusso aperto puo'
   * contenere action (Invoke Subagent / Sub Agent) che puntavano al subagent eliminato.
   * In errore non si naviga: la riga resta al suo posto.
   */
  private deleteSubagent(sa: SubagentItem): void {
    this.isDeleting = true;
    this.faqKbService.deleteFaqKb(sa._id).subscribe({
      next: () => {
        // isDeleting resta true: la pagina sta per ricaricarsi, nessun altro click nel frattempo
        this.logger.log('[CDS-PANEL-SUBAGENTS] subagent deleted:', sa._id);
        this.goToParentAndReload();
      },
      error: (error) => {
        this.isDeleting = false;
        this.logger.error('[CDS-PANEL-SUBAGENTS] delete error:', error);
      }
    });
  }
}
