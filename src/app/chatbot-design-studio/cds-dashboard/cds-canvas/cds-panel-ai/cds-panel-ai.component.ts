import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, finalize, take, takeUntil } from 'rxjs/operators';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { AgentHash, AgentRevisionsService, RestoreResult, Revision, RevisionKind, RevisionsError } from 'src/app/chatbot-design-studio/services/agent-revisions.service';
import { AgentGeneratorService, EditHistoryEntry, EditProposal, ServiceHealth, ServiceModel, describeGeneratorError } from 'src/app/chatbot-design-studio/services/agent-generator.service';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { CompileError } from 'src/app/chatbot-design-studio/ai-authoring/blueprint-compiler';
import { CdsAgentGeneratorComponent, seedGeneratorDraft } from 'src/app/modals/cds-agent-generator/cds-agent-generator.component';

const swal = require('sweetalert');

/** Flag in sessionStorage: dopo la ricarica della pagina il canvas riapre il pannello su questo agente. */
export const AI_PANEL_REOPEN_KEY = 'cds-ai-panel-reopen';

const PAGE_SIZE = 50;
const RESTORE_CONFLICT = 409;

type Tab = 'chat' | 'versions';
type Busy = 'loading' | 'saving' | 'restoring' | 'copying' | 'prompt' | 'proposing' | 'applying' | null;
/** Il modello scelto l'ultima volta: la stessa preferenza della modale di creazione. */
const MODEL_PREFERENCE_KEY = 'cds-agent-generator-model';

/** Una voce della scheda «Chat»: la storia dei prompt (creazione, modifiche via prompt, ripristini). */
export interface TimelineItem {
  id: string;
  seq: number;
  kind: 'creation' | 'edit' | 'restore';
  /** Prompt finale (creazione) o istruzione (modifica). */
  text: string;
  /** Note del generatore (creazione) o spiegazione dell'AI (modifica). */
  explanation: string;
  at: string;
  model: string;
  changes: { added: number; updated: number; removed: number } | null;
  /** Annullata da un ripristino successivo. */
  undone: boolean;
  /** Ripristino: il numero della revisione a cui si e' tornati. */
  restoredTo: number | null;
  /** Modifica: la revisione a cui torna «Ripristina» (lo stato prima della modifica). */
  restoreTarget: string | null;
  isMine: boolean;
}

/**
 * Pannello AI a destra: la storia dei prompt dell'agente, le sue versioni e il ripristino
 * (docs/V3/ai-authoring/ds-revisions-plan.md, fase D). Legge tutto dal modulo delle revisioni del server;
 * non ricompone mai lo stato: chiama le rotte e, dopo un ripristino, ricarica la pagina.
 */
@Component({
  selector: 'cds-panel-ai',
  templateUrl: './cds-panel-ai.component.html',
  styleUrls: ['./cds-panel-ai.component.scss']
})
export class CdsPanelAiComponent implements OnInit, OnDestroy {

  @Input() selectedChatbot: Chatbot;
  @Input() projectID: string;
  @Output() closePanel = new EventEmitter<void>();

  tab: Tab = 'chat';
  busy: Busy = null;
  errorMessage = '';
  revisions: Revision[] = [];
  total = 0;
  hash: AgentHash | null = null;
  timeline: TimelineItem[] = [];
  /** Revisioni con il prompt aperto, gia' lette per intero. */
  openPrompts: { [revisionId: string]: Revision } = {};
  copiedId: string | null = null;
  /** Compositore della modifica via prompt: c'e' se il servizio di generazione e' configurato. */
  get canEdit(): boolean { return this.agentGeneratorService.isConfigured; }
  draft = '';
  models: ServiceModel[] = [];
  selectedModel: string | null = null;
  recommendedModel: string | null = null;
  /** La proposta in attesa di «Applica»; il turno effimero in chat mostra istruzione e spiegazione. */
  proposal: EditProposal | null = null;
  pendingInstruction = '';
  compileProblems: string[] = [];

  private currentUserId = '';
  private readonly unsubscribe$ = new Subject<void>();
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly agentRevisionsService: AgentRevisionsService,
    private readonly agentGeneratorService: AgentGeneratorService,
    private readonly tiledeskAuthService: TiledeskAuthService,
    private readonly intentService: IntentService,
    private readonly translate: TranslateService,
    private readonly router: Router,
    private readonly dialog: MatDialog
  ) { }

  /** Il modulo delle revisioni del server risponde: senza, il pannello lo dice e non chiama nessuna rotta. */
  get moduleEnabled(): boolean { return this.agentRevisionsService.enabled; }

  ngOnInit(): void {
    const user: any = this.tiledeskAuthService.getCurrentUser();
    this.currentUserId = user?._id || user?.uid || '';
    if (!this.moduleEnabled) {
      // Il probe potrebbe non essere ancora finito: se arriva dopo, si carica allora
      this.agentRevisionsService.enabled$.pipe(takeUntil(this.unsubscribe$)).subscribe(enabled => { if (enabled && !this.revisions.length) this.load(); });
    } else {
      this.load();
    }
    if (this.canEdit) {
      this.agentGeneratorService.health().pipe(takeUntil(this.unsubscribe$)).subscribe(health => this.onHealth(health));
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  get botId(): string { return this.selectedChatbot?._id; }
  get isBusy(): boolean { return this.busy !== null; }
  get modified(): boolean { return !!this.hash?.modified; }
  get lastSeq(): number | null { return this.hash?.revision_seq ?? null; }
  /** Le voci della scheda «Chat» in ordine cronologico. */
  get chatItems(): TimelineItem[] { return this.timeline; }
  /** Le versioni, dalla piu' recente. */
  get versionItems(): Revision[] { return this.revisions; }
  get hasMore(): boolean { return this.revisions.length < this.total; }

  // -------------------------------------------------------
  // Caricamento
  // -------------------------------------------------------

  load(): void {
    if (!this.botId) return;
    this.busy = 'loading';
    this.errorMessage = '';
    forkJoin({
      list: this.agentRevisionsService.listRevisions(this.botId, 0, PAGE_SIZE),
      hash: this.agentRevisionsService.hash(this.botId).pipe(catchError(() => of(null)))
    }).pipe(takeUntil(this.unsubscribe$), finalize(() => this.busy = null)).subscribe({
      next: ({ list, hash }) => {
        this.revisions = list.items || [];
        this.total = list.total || this.revisions.length;
        this.hash = hash;
        this.timeline = this.buildTimeline(this.revisions);
      },
      error: (err: RevisionsError) => this.fail(err, 'CDSAiPanel.ErrorLoad')
    });
  }

  loadMore(): void {
    if (!this.hasMore || this.isBusy) return;
    this.busy = 'loading';
    const page = Math.floor(this.revisions.length / PAGE_SIZE);
    this.agentRevisionsService.listRevisions(this.botId, page, PAGE_SIZE)
      .pipe(takeUntil(this.unsubscribe$), finalize(() => this.busy = null))
      .subscribe({
        next: list => {
          const known = new Set(this.revisions.map(r => r.revision_id));
          this.revisions = this.revisions.concat((list.items || []).filter(r => !known.has(r.revision_id)));
          this.total = list.total || this.revisions.length;
          this.timeline = this.buildTimeline(this.revisions);
        },
        error: (err: RevisionsError) => this.fail(err, 'CDSAiPanel.ErrorLoad')
      });
  }

  /**
   * La chat dalle revisioni: creazione, modifiche via prompt e ripristini, in ordine di sequenza.
   * Una voce e' annullata se un ripristino successivo e' tornato a una revisione piu' vecchia di lei.
   */
  private buildTimeline(revisions: Revision[]): TimelineItem[] {
    const bySeq = revisions.slice().sort((a, b) => a.seq - b.seq);
    const byId = new Map(bySeq.map(r => [r.revision_id, r]));
    const undone = new Set<string>();
    bySeq.filter(r => r.kind === 'restore' && r.parent_id).forEach(restore => {
      const target = byId.get(restore.parent_id as string);
      const targetSeq = target ? target.seq : -1;
      bySeq.forEach(r => {
        if (r.seq > targetSeq && r.seq < restore.seq && r.kind !== 'release') undone.add(r.revision_id);
      });
    });
    const items: TimelineItem[] = [];
    bySeq.forEach(r => {
      const base = {
        id: r.revision_id, seq: r.seq, at: r.createdAt, undone: undone.has(r.revision_id),
        isMine: !!this.currentUserId && r.createdBy === this.currentUserId,
        model: r.ai?.result?.model || r.ai?.request?.model || '',
        restoredTo: null as number | null, restoreTarget: null as string | null, changes: null as TimelineItem['changes']
      };
      if (r.kind === 'ai_create') {
        items.push({ ...base, kind: 'creation', text: r.ai?.request?.initialPrompt || r.note || '', explanation: (r.ai?.result?.notes || []).join(' ') });
      } else if (r.kind === 'ai_edit') {
        const c = r.ai?.result?.changes;
        items.push({
          ...base, kind: 'edit', text: r.ai?.request?.instruction || r.note || '', explanation: r.ai?.result?.explanation || '',
          changes: c ? { added: c.added?.length || 0, updated: c.updated?.length || 0, removed: c.removed?.length || 0 } : null,
          restoreTarget: r.parent_id || null
        });
      } else if (r.kind === 'restore') {
        const target = r.parent_id ? byId.get(r.parent_id) : null;
        items.push({ ...base, kind: 'restore', text: '', explanation: r.note || '', restoredTo: target ? target.seq : null });
      }
    });
    return items;
  }

  // -------------------------------------------------------
  // Azioni: versioni
  // -------------------------------------------------------

  /** «Salva versione»: un checkpoint con una nota facoltativa. */
  saveVersion(): void {
    if (this.isBusy) return;
    swal({
      title: this.translate.instant('CDSAiPanel.SaveVersionTitle'),
      text: this.translate.instant('CDSAiPanel.SaveVersionText'),
      content: { element: 'input', attributes: { placeholder: this.translate.instant('CDSAiPanel.SaveVersionPlaceholder'), type: 'text' } },
      buttons: [this.translate.instant('Cancel'), this.translate.instant('CDSAiPanel.Save')]
    }).then((note: string | null) => {
      if (note === null) return;
      this.busy = 'saving';
      this.agentRevisionsService.checkpoint(this.botId, note || undefined)
        .pipe(takeUntil(this.unsubscribe$), finalize(() => this.busy = null))
        .subscribe({
          next: () => this.load(),
          error: (err: RevisionsError) => this.fail(err, 'CDSAiPanel.ErrorSave')
        });
    });
  }

  /** «Ripristina» su una modifica: torna allo stato prima di quella modifica. */
  restoreBeforeEdit(item: TimelineItem): void {
    if (!item.restoreTarget) return;
    const target = this.revisions.find(r => r.revision_id === item.restoreTarget);
    this.confirmRestore({ revision_id: item.restoreTarget }, target ? target.seq : null);
  }

  /** «Ripristina qui» su una versione. */
  restoreRevision(revision: Revision): void {
    if (revision.kind === 'release') {
      this.confirmRestore({ release_id: revision.release_id as string }, revision.seq);
      return;
    }
    this.confirmRestore({ revision_id: revision.revision_id }, revision.seq);
  }

  /**
   * Prima la prova a secco sul server (riferimenti a dipartimenti, knowledge base, tabelle e agenti che
   * non esistono piu'), poi la conferma con l'esito, poi il ripristino vero.
   */
  private confirmRestore(source: { revision_id?: string; release_id?: string }, seq: number | null): void {
    if (this.isBusy) return;
    this.busy = 'restoring';
    this.errorMessage = '';
    this.agentRevisionsService.restore(this.botId, { ...source, dry_run: true, expectedHash: this.hash?.contentHash })
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (check: any) => {
          this.busy = null;
          const missing: any[] = Array.isArray(check?.missing) ? check.missing : [];
          const lines = missing.slice(0, 8).map(m => '• ' + this.translate.instant('CDSAiPanel.Missing.' + m.kind) + ': ' + m.value + (m.intent_display_name ? ' (' + m.intent_display_name + ')' : ''));
          const warning = lines.length ? '\n\n' + this.translate.instant('CDSAiPanel.MissingIntro') + '\n' + lines.join('\n') : '';
          this.askRestore(source, seq, warning, lines.length > 0);
        },
        error: (err: RevisionsError) => { this.busy = null; this.fail(err, 'CDSAiPanel.ErrorRestore'); }
      });
  }

  private askRestore(source: { revision_id?: string; release_id?: string }, seq: number | null, warning: string, hasMissing: boolean): void {
    swal({
      title: this.translate.instant('CDSAiPanel.RestoreTitle', { seq: seq ?? '' }),
      text: this.translate.instant('CDSAiPanel.RestoreText') + warning,
      icon: 'warning',
      buttons: [this.translate.instant('Cancel'), this.translate.instant(hasMissing ? 'CDSAiPanel.RestoreAnyway' : 'CDSAiPanel.Restore')],
      dangerMode: hasMissing
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.busy = 'restoring';
      this.errorMessage = '';
      this.agentRevisionsService.restore(this.botId, { ...source, expectedHash: this.hash?.contentHash })
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe({
          next: () => this.reloadAgent(),
          error: (err: RevisionsError) => {
            this.busy = null;
            if (err.status === RESTORE_CONFLICT) {
              this.errorMessage = this.translate.instant('CDSAiPanel.RestoreConflict');
              this.load();
            } else {
              this.fail(err, 'CDSAiPanel.ErrorRestore');
            }
          }
        });
    });
  }

  /** «Crea copia»: un agente nuovo da questa versione. */
  createCopy(revision: Revision): void {
    if (this.isBusy) return;
    const proposed = (this.selectedChatbot?.name || '') + ' (' + this.translate.instant('CDSAiPanel.CopySuffix') + ')';
    swal({
      title: this.translate.instant('CDSAiPanel.CopyTitle'),
      text: this.translate.instant('CDSAiPanel.CopyText', { seq: revision.seq }),
      content: { element: 'input', attributes: { value: proposed, type: 'text' } },
      buttons: [this.translate.instant('Cancel'), this.translate.instant('CDSAiPanel.CreateCopy')]
    }).then((name: string | null) => {
      if (name === null) return;
      this.busy = 'copying';
      const source = revision.kind === 'release' ? { release_id: revision.release_id as string } : { revision_id: revision.revision_id };
      this.agentRevisionsService.restore(this.botId, { ...source, as_copy: true, name: (name || proposed).trim() })
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe({
          next: res => this.openAgent((res as RestoreResult).bot_id),
          error: (err: RevisionsError) => { this.busy = null; this.fail(err, 'CDSAiPanel.ErrorCopy'); }
        });
    });
  }

  // -------------------------------------------------------
  // Azioni: prompt
  // -------------------------------------------------------

  isPromptOpen(revision: Revision): boolean { return !!this.openPrompts[revision.revision_id]; }

  /** «Vedi prompt»: legge la revisione completa (il prompt finale non sta nelle liste). */
  togglePrompt(revision: Revision): void {
    if (this.openPrompts[revision.revision_id]) {
      delete this.openPrompts[revision.revision_id];
      return;
    }
    if (this.isBusy) return;
    this.busy = 'prompt';
    this.agentRevisionsService.getRevision(revision.revision_id)
      .pipe(takeUntil(this.unsubscribe$), finalize(() => this.busy = null))
      .subscribe({
        next: full => this.openPrompts[revision.revision_id] = full,
        error: (err: RevisionsError) => this.fail(err, 'CDSAiPanel.ErrorLoad')
      });
  }

  promptOf(revision: Revision): string {
    const full = this.openPrompts[revision.revision_id];
    return full?.ai?.request?.finalPrompt || full?.ai?.request?.instruction || '';
  }

  copyPrompt(revision: Revision): void {
    const text = this.promptOf(revision);
    if (!text || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedId = revision.revision_id;
      setTimeout(() => this.copiedId = null, 1500);
    });
  }

  /** «Riusa nel generatore»: la modale di creazione riparte da questo prompt finale. */
  reuseInGenerator(revision: Revision): void {
    if (this.isBusy) return;
    const start = (full: Revision) => {
      const prompt = full?.ai?.request?.finalPrompt || '';
      if (!prompt) return;
      seedGeneratorDraft(this.projectID, prompt, this.selectedChatbot?.name || '', full?.ai?.request?.initialPrompt || '');
      this.openGenerator();
    };
    const known = this.openPrompts[revision.revision_id];
    if (known) { start(known); return; }
    this.busy = 'prompt';
    this.agentRevisionsService.getRevision(revision.revision_id)
      .pipe(takeUntil(this.unsubscribe$), finalize(() => this.busy = null))
      .subscribe({ next: start, error: (err: RevisionsError) => this.fail(err, 'CDSAiPanel.ErrorLoad') });
  }

  private openGenerator(): void {
    if (this.agentGeneratorService.isOpen) return;
    this.agentGeneratorService.open();
    const dialogRef = this.dialog.open(CdsAgentGeneratorComponent, {
      width: '920px', maxWidth: '94vw', maxHeight: '92vh', autoFocus: false, restoreFocus: true,
      panelClass: 'cds-agent-generator-dialog', backdropClass: 'cds-agent-generator-backdrop'
    });
    dialogRef.afterClosed().pipe(take(1)).subscribe(() => this.agentGeneratorService.close());
  }

  // -------------------------------------------------------
  // Modifica via prompt
  // -------------------------------------------------------

  private onHealth(health: ServiceHealth | null): void {
    this.models = health?.models || [];
    this.recommendedModel = health?.recommended || null;
    if (!this.models.length) return;
    const available = (id: string | null) => !!id && this.models.some(m => m.id === id);
    if (!available(this.selectedModel)) {
      let preferred: string | null = null;
      try { preferred = localStorage.getItem(MODEL_PREFERENCE_KEY); } catch (e) { preferred = null; }
      this.selectedModel = available(preferred) ? preferred : (available(this.recommendedModel) ? this.recommendedModel : this.models[0].id);
    }
  }

  selectModel(id: string | null): void {
    if (!id || !this.models.some(m => m.id === id)) return;
    this.selectedModel = id;
    try { localStorage.setItem(MODEL_PREFERENCE_KEY, id); } catch (e) { /* preferenza non salvata */ }
  }

  /** «Riusa»: l'istruzione (o il prompt di creazione) torna nella textarea. */
  reuseInstruction(item: TimelineItem): void {
    if (this.isBusy || !item.text) return;
    this.draft = item.text;
  }

  /** Chiedere una proposta non richiede il modulo del server: lo richiede solo «Applica». */
  get canSubmit(): boolean { return this.canEdit && !this.isBusy && !this.proposal && !!this.draft.trim(); }
  get canApply(): boolean { return !!this.proposal && this.moduleEnabled && !this.isBusy; }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.submitInstruction();
    }
  }

  /** Chiede la proposta al servizio: nessuna scrittura finche' l'utente non applica. */
  submitInstruction(): void {
    const instruction = this.draft.trim();
    if (!instruction || !this.canSubmit) return;
    this.errorMessage = '';
    this.compileProblems = [];
    this.pendingInstruction = instruction;
    this.draft = '';
    this.busy = 'proposing';
    const intents = this.intentService.listOfIntents || [];
    const history: EditHistoryEntry[] = this.timeline.filter(i => i.kind === 'edit' && !i.undone).slice(-5).map(i => ({ instruction: i.text, explanation: i.explanation }));
    this.agentGeneratorService.edit(instruction, intents, { name: this.selectedChatbot?.name, language: this.selectedChatbot?.language }, this.selectedModel, history)
      .pipe(takeUntil(this.unsubscribe$), finalize(() => this.busy = null))
      .subscribe({
        next: proposal => {
          this.proposal = proposal;
          this.compileProblems = [];
        },
        error: (err: any) => {
          this.draft = instruction;
          this.pendingInstruction = '';
          if (err instanceof CompileError) {
            this.compileProblems = err.problems.slice(0, 6);
            this.errorMessage = this.translate.instant('CDSAiPanel.EditCompileError');
            return;
          }
          const failure = describeGeneratorError(err);
          this.errorMessage = this.translate.instant(failure.messageKey);
          this.compileProblems = failure.details.slice(0, 6);
        }
      });
  }

  get proposalSummary() { return this.proposal?.compiled.summary || null; }

  /** «Applica»: il server applica le operazioni in modo atomico e registra la revisione; poi la pagina si ricarica. */
  applyProposal(): void {
    if (!this.canApply) return;
    const proposal = this.proposal;
    this.busy = 'applying';
    this.errorMessage = '';
    const ai = {
      request: { instruction: this.pendingInstruction, model: proposal.response.model, promptVersion: proposal.response.promptVersion },
      result: {
        explanation: proposal.response.explanation, operations: proposal.response.operations, warnings: proposal.response.warnings,
        blueprintVersion: proposal.response.blueprintVersion, idMap: proposal.compiled.idMap, model: proposal.response.model, promptVersion: proposal.response.promptVersion
      }
    };
    this.agentRevisionsService.edit(this.botId, { operations: proposal.compiled.faqOperations, ai, expectedHash: this.hash?.contentHash, note: this.pendingInstruction.slice(0, 120) })
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: () => {
          this.agentGeneratorService.feedback(null, { outcome: 'applied', phase: 'edit', model: proposal.response.model, promptVersion: proposal.response.promptVersion });
          this.reloadAgent();
        },
        error: (err: RevisionsError) => {
          this.busy = null;
          if (err.status === RESTORE_CONFLICT) {
            this.errorMessage = this.translate.instant('CDSAiPanel.EditConflict');
            this.load();
          } else {
            this.fail(err, 'CDSAiPanel.ErrorApply');
          }
        }
      });
  }

  /** «Scarta»: nessuna traccia, solo il feedback al servizio. */
  discardProposal(): void {
    if (!this.proposal || this.isBusy) return;
    this.agentGeneratorService.feedback(null, { outcome: 'discarded', phase: 'edit', model: this.proposal.response.model, promptVersion: this.proposal.response.promptVersion });
    this.draft = this.pendingInstruction;
    this.proposal = null;
    this.pendingInstruction = '';
  }

  // -------------------------------------------------------
  // Utilita'
  // -------------------------------------------------------

  kindLabel(kind: RevisionKind): string { return 'CDSAiPanel.Kind.' + kind; }
  reasonLabel(revision: Revision): string { return revision.reason ? 'CDSAiPanel.Reason.' + revision.reason : ''; }
  isMine(revision: Revision): boolean { return !!this.currentUserId && revision.createdBy === this.currentUserId; }
  canRestore(revision: Revision): boolean { return revision.kind === 'release' ? !!revision.release_id : !!revision.snapshot; }
  hasPrompt(revision: Revision): boolean { return revision.kind === 'ai_create' || revision.kind === 'ai_edit'; }
  trackByRevision(_: number, r: Revision): string { return r.revision_id; }
  trackByItem(_: number, item: TimelineItem): string { return item.id; }

  onClose(): void {
    if (this.isBusy) return;
    this.closePanel.emit();
  }

  /** Dopo un ripristino la pagina si ricarica con il pannello che si riapre da solo. */
  private reloadAgent(): void {
    try { sessionStorage.setItem(AI_PANEL_REOPEN_KEY, this.botId); } catch (e) { /* niente riapertura */ }
    window.location.reload();
  }

  private openAgent(botId: string): void {
    try { sessionStorage.setItem(AI_PANEL_REOPEN_KEY, botId); } catch (e) { /* niente riapertura */ }
    this.router.navigate(['/project', this.projectID, 'chatbot', botId, 'blocks']).then(() => window.location.reload());
  }

  private fail(err: RevisionsError, key: string): void {
    this.logger.error('[CDS-PANEL-AI] ', key, err);
    this.errorMessage = this.translate.instant(key) + (err?.message ? ' (' + err.message + ')' : '');
  }
}
