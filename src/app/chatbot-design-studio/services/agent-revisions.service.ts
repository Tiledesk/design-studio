import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, shareReplay, take, tap } from 'rxjs/operators';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';

/**
 * Storia e ripristino degli agenti: il client del modulo `aiGenerations` del server Tiledesk
 * (`/:projectid/modules/ai-generations`, docs/V3/ai-authoring/agent-revisions-design.md).
 *
 * Il modulo esiste solo se il server lo ha acceso (`AI_GENERATIONS_ENABLED=true`): `probe()` lo scopre
 * una volta per progetto e `enabled$` guida tutto il resto. Con il modulo spento nessuna rotta viene
 * chiamata e il DS si comporta come prima.
 */

export type RevisionKind = 'ai_create' | 'ai_edit' | 'checkpoint' | 'auto' | 'restore' | 'release';
export type RevisionReason = 'before_ai_edit' | 'before_restore' | 'manual_changes' | 'in_place' | 'as_copy' | null;

/** Il blocco `ai` di una revisione, come lo manda il DS e come torna dal server (senza i campi pesanti nelle liste). */
export interface RevisionAi {
  request?: {
    initialPrompt?: string;
    finalPrompt?: string;
    finalPromptEdited?: boolean;
    interview?: { questions: number; promptVersion?: string; model?: string };
    assumptions?: string[];
    unsupported?: string[];
    /** Solo `ai_edit`: l'istruzione dell'utente. */
    instruction?: string;
    model?: string;
    promptVersion?: string;
  };
  result?: {
    blueprint?: any;
    blueprintVersion?: string;
    idMap?: { [blockId: string]: string };
    notes?: string[];
    warnings?: string[];
    model?: string;
    promptVersion?: string;
    catalogVersion?: string;
    compilerVersion?: string;
    /** Solo `ai_edit`: la spiegazione dell'AI e le operazioni proposte. */
    explanation?: string;
    operations?: any[];
    /** Solo `ai_edit`, calcolato dal server. */
    changes?: { added: string[]; updated: string[]; removed: string[] };
  };
}

export interface Revision {
  revision_id: string;
  id_project: string;
  id_faq_kb: string;
  seq: number;
  kind: RevisionKind;
  reason?: RevisionReason;
  note?: string;
  parent_id?: string | null;
  ai?: RevisionAi;
  snapshot?: { encoding: string; bytes: number; intents: number };
  /** Lo snapshot decompresso, solo da `getRevision(id, true)`. */
  snapshotData?: any;
  contentHash?: string | null;
  release_id?: string | null;
  publishedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RevisionList { items: Revision[]; total: number; page: number; limit: number; }
export interface AgentHash { contentHash: string; intents: number; revision_id: string | null; revision_seq: number | null; modified: boolean | null; }
export interface ModuleStatus { enabled: boolean; module: string; transactions: boolean; max_intents: number; }
export interface CreatedWithRevision { bot_id: string; chatbot: any; revision: Revision; }
export interface RestoreResult { bot_id: string; revision: Revision; backup: Revision | null; chatbot?: any; }
export interface EditResult { bot_id: string; revision: Revision; backup: Revision | null; changes: { added: string[]; updated: string[]; removed: string[] }; }

/** Operazione sui blocchi per la rotta `edit` del server: come `ops_update`, ma attesa e atomica. */
export interface BlockOperation { type: 'post' | 'put' | 'delete'; intent: any; }

export interface RestoreRequest {
  revision_id?: string;
  release_id?: string;
  as_copy?: boolean;
  expectedHash?: string;
  note?: string;
  name?: string;
  /** Prova a secco: nessuna scrittura, risposta con i riferimenti esterni mancanti. */
  dry_run?: boolean;
}

/** Un riferimento esterno dello snapshot che nel progetto non esiste piu'. */
export interface MissingReference { kind: 'department' | 'knowledge_base' | 'data_table' | 'chatbot'; value: string; intent_display_name?: string; }
export interface RestoreDryRun { dry_run: true; source: string; intents: number; contentHash: string; changed: boolean; missing: MissingReference[]; }

export interface EditRequest {
  operations: BlockOperation[];
  ai?: RevisionAi;
  expectedHash?: string;
  note?: string;
}

/** Errore di una rotta del modulo, con lo stato HTTP e i dettagli del server. */
export interface RevisionsError { status: number; message: string; details?: any; }

@Injectable({ providedIn: 'root' })
export class AgentRevisionsService {

  private logger: LoggerService = LoggerInstance.getInstance();
  private baseUrl = '';
  private projectId = '';
  private tiledeskToken = '';
  private configEnabled = true;
  private probe$: Observable<boolean> | null = null;
  private readonly _enabled$ = new BehaviorSubject<boolean>(false);
  private _status: ModuleStatus | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly appStorageService: AppStorageService
  ) { }

  /**
   * @param serverBaseUrl base URL delle API Tiledesk (con la barra finale)
   * @param projectId progetto corrente
   * @param configEnabled chiave `aiRevisionsEnabled` della remote config: con false non si fa nemmeno il probe
   */
  initialize(serverBaseUrl: string, projectId: string, configEnabled: boolean = true): void {
    this.baseUrl = (serverBaseUrl || '').replace(/\/+$/, '') + '/' + projectId + '/modules/ai-generations';
    this.projectId = projectId;
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    this.configEnabled = configEnabled !== false;
    this.probe$ = null;
    this._status = null;
    this._enabled$.next(false);
  }

  /** True se il modulo del server risponde (dopo `probe()`). */
  get enabled(): boolean { return this._enabled$.value; }
  get enabled$(): Observable<boolean> { return this._enabled$.asObservable(); }
  get status(): ModuleStatus | null { return this._status; }

  /**
   * Scopre se il modulo è acceso: una chiamata per progetto, condivisa fra chi la chiede.
   * 200 → acceso; 404 o errore → spento. Con la remote config spenta emette false senza chiamare.
   */
  probe(): Observable<boolean> {
    if (!this.configEnabled || !this.projectId) return of(false);
    if (!this.probe$) {
      this.probe$ = this.http.get<ModuleStatus>(this.baseUrl + '/', this.options()).pipe(
        map(status => !!(status && status.enabled)),
        tap(enabled => { if (enabled) this.logger.log('[AGENT-REVISIONS] module enabled'); }),
        catchError(err => {
          this.logger.log('[AGENT-REVISIONS] module not available: ', err?.status);
          return of(false);
        }),
        tap(enabled => this._enabled$.next(enabled)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
      this.http.get<ModuleStatus>(this.baseUrl + '/', this.options()).pipe(take(1)).subscribe({
        next: status => this._status = status,
        error: () => this._status = null
      });
    }
    return this.probe$;
  }

  // -------------------------------------------------------------------------------------------
  // Rotte
  // -------------------------------------------------------------------------------------------

  /** Creazione atomica: agente compilato + blocco `ai`. Il server risponde dopo aver salvato i blocchi. */
  createAgent(agent: any, ai: RevisionAi, note?: string): Observable<CreatedWithRevision> {
    return this.http.post<CreatedWithRevision>(this.baseUrl + '/agents', { agent, ai, note }, this.options()).pipe(catchError(err => this.fail(err)));
  }

  listRevisions(botId: string, page: number = 0, limit: number = 20): Observable<RevisionList> {
    return this.http.get<RevisionList>(this.baseUrl + '/agents/' + botId + '/revisions?page=' + page + '&limit=' + limit, this.options()).pipe(catchError(err => this.fail(err)));
  }

  getRevision(revisionId: string, withSnapshot: boolean = false): Observable<Revision> {
    return this.http.get<Revision>(this.baseUrl + '/revisions/' + revisionId + (withSnapshot ? '?snapshot=true' : ''), this.options()).pipe(catchError(err => this.fail(err)));
  }

  hash(botId: string): Observable<AgentHash> {
    return this.http.get<AgentHash>(this.baseUrl + '/agents/' + botId + '/hash', this.options()).pipe(catchError(err => this.fail(err)));
  }

  checkpoint(botId: string, note?: string): Observable<Revision> {
    return this.http.post<{ revision: Revision }>(this.baseUrl + '/agents/' + botId + '/revisions', { note }, this.options()).pipe(
      map(res => res.revision),
      catchError(err => this.fail(err))
    );
  }

  linkRelease(botId: string, releaseId: string): Observable<Revision> {
    return this.http.post<{ revision: Revision }>(this.baseUrl + '/agents/' + botId + '/revisions/release', { release_id: releaseId }, this.options()).pipe(
      map(res => res.revision),
      catchError(err => this.fail(err))
    );
  }

  restore(botId: string, request: RestoreRequest): Observable<RestoreResult | RestoreDryRun> {
    return this.http.post<RestoreResult | RestoreDryRun>(this.baseUrl + '/agents/' + botId + '/restore', request, this.options()).pipe(catchError(err => this.fail(err)));
  }

  edit(botId: string, request: EditRequest): Observable<EditResult> {
    return this.http.post<EditResult>(this.baseUrl + '/agents/' + botId + '/edit', request, this.options()).pipe(catchError(err => this.fail(err)));
  }

  deleteHistory(botId: string): Observable<{ deleted: number }> {
    return this.http.delete<{ success: boolean; deleted: number }>(this.baseUrl + '/agents/' + botId + '/revisions', this.options()).pipe(catchError(err => this.fail(err)));
  }

  // -------------------------------------------------------------------------------------------
  // Agganci fire-and-forget: non bloccano mai l'utente
  // -------------------------------------------------------------------------------------------

  /** Dopo una pubblicazione: collega la release alla storia. Errori solo nel log. */
  linkReleaseQuietly(botId: string, releaseId: string): void {
    if (!this.enabled || !botId || !releaseId) return;
    this.linkRelease(botId, releaseId).pipe(take(1)).subscribe({
      next: rev => this.logger.log('[AGENT-REVISIONS] release linked: ', rev?.seq),
      error: err => this.logger.log('[AGENT-REVISIONS] release not linked: ', err?.status)
    });
  }

  /** Dopo la cancellazione di un agente: cancella la storia. Errori solo nel log. */
  deleteHistoryQuietly(botId: string): void {
    if (!this.enabled || !botId) return;
    this.deleteHistory(botId).pipe(take(1)).subscribe({
      next: res => this.logger.log('[AGENT-REVISIONS] history deleted: ', res?.deleted),
      error: err => this.logger.log('[AGENT-REVISIONS] history not deleted: ', err?.status)
    });
  }

  // -------------------------------------------------------------------------------------------

  private options() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
  }

  private fail(err: any): Observable<never> {
    const error: RevisionsError = {
      status: err?.status || 0,
      message: err?.error?.message || err?.message || 'Error',
      details: err?.error?.details
    };
    this.logger.error('[AGENT-REVISIONS] error: ', error.status, error.message);
    throw error;
  }
}
