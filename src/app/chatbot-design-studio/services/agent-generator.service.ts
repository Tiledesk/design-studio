import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, switchMap, take } from 'rxjs/operators';

import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { OpenaiService } from 'src/app/services/openai.service';

/** Tipo di agente da generare: determina l'entry point del flow lato server. */
export enum BOT_TYPE {
  CHAT     = 'chat',
  WEBHOOK  = 'webhook',
  COPILOT  = 'copilot'
}

/** Un turno della conversazione col planner (la memoria vive nel client). */
export interface PlanMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Stato di un turno del planner: domanda di chiarimento o piano compilabile. */
export enum PLAN_STATUS {
  ASK   = 'ask',
  READY = 'ready'
}

/** Turno del planner normalizzato. */
export interface PlanTurn {
  status: PLAN_STATUS;
  /** Testo da mostrare in chat: domanda oppure riepilogo del piano. */
  message: string;
  /** Presente con status 'ready': brief autosufficiente da passare a generate(). */
  spec?: string;
  /** Integrazioni esterne rilevate come necessarie (nomi canonici). */
  requiredIntegrations: string[];
}

/** Una voce della galleria dei casi d'uso. */
export interface UseCase {
  id: string;
  title: string;
  category: string;
  tags: string[];
  botType: string;
  integrationTier: string;
  /** Meta-prompt pronto: il click sulla card lo inietta nella textarea. */
  prompt: string;
}

export interface UseCaseGallery {
  categories: string[];
  cases: UseCase[];
}

/**
 * Blueprint: il flusso semplificato prodotto dal generatore, un'action per blocco.
 * Contratto in docs/V3/ai-authoring (blueprint.schema.json nel repo del servizio).
 */
export interface BlueprintButton {
  label: string;
  goto?: string | null;
  url?: string | null;
}

export interface BlueprintBlock {
  id: string;
  name: string;
  type: string;
  text?: string | null;
  buttons?: BlueprintButton[] | null;
  options?: string[] | null;
  saveTo?: string | null;
  when?: string | null;
  destination?: string | null;
  value?: string | null;
  fromVariable?: string | null;
  department?: string | null;
  knowledgeBase?: string | null;
  question?: string | null;
  next?: string | null;
  exits?: { true: string; false: string } | null;
}

export interface Blueprint {
  version: string;
  name: string;
  language: string;
  start: string;
  fallbackText: string | null;
  fallbackNext: string | null;
  notes: string[];
  blocks: BlueprintBlock[];
}

/** Risposta di POST /generate del generatore. */
export interface GenerateResponse {
  blueprint: Blueprint;
  notes: string[];
  warnings: string[];
  attempts: number;
  model: string;
  promptVersion: string;
  usage?: { inputTokens: number; outputTokens: number; cachedTokens: number };
}

/** Errore del generatore, pronto per la UI: chiave i18n del messaggio e dettagli. */
export interface GeneratorFailure {
  messageKey: string;
  details: string[];
}

/** URL e chiave del servizio di generazione, dalla remote config. */
export interface AgentGeneratorConfig {
  url?: string;
  key?: string;
}

const GALLERY_ASSET_URL = 'assets/gallery/use-cases.gallery.json';
const CATALOG_ASSET_URL = 'assets/ai-authoring/v3-catalog-1.json';
const EMPTY_GALLERY: UseCaseGallery = { categories: [], cases: [] };
const MAX_BLOCKS = 40;

/** Traduce un errore della chiamata al generatore nel messaggio da mostrare. */
export function describeGeneratorError(err: any): GeneratorFailure {
  const prefix = 'CDSAgentGenerator.';
  if (err?.notConfigured) return { messageKey: prefix + 'ErrorNotConfigured', details: [] };
  const status = err?.status ?? 0;
  const body = err?.error ?? {};
  const details = Array.isArray(body?.details) ? body.details.map((d: any) => String(d)) : [];
  let key = 'ErrorGeneric';
  if (status === 0) key = 'ErrorUnreachable';
  else if (status === 401) key = 'ErrorUnauthorized';
  else if (status === 400 && body?.error === 'model_not_allowed') key = 'ErrorModelNotAllowed';
  else if (status === 400) key = 'ErrorBadRequest';
  else if (status === 422) key = 'ErrorInvalidBlueprint';
  else if (status === 429) key = 'ErrorRateLimited';
  else if (status === 502) key = 'ErrorLlm';
  return { messageKey: prefix + key, details };
}

/**
 * Feature "Crea agente con l'AI".
 *
 * Due responsabilita':
 * - lo stato di apertura della modale (il pulsante la apre, la modale osserva);
 * - le chiamate al servizio di generazione, esterno a Tiledesk (su Render):
 *   `POST {aiAgentGeneratorUrl}/generate` con la chiave `aiAgentGeneratorKey`.
 *
 * Il servizio non riceve mai il token Tiledesk: le sue chiamate usano un client HTTP
 * senza interceptor. Contratto: docs/V3/ai-authoring/endpoint-contract.md.
 * `planTurn` (intervista) resta da collegare: l'endpoint `/plan` non esiste ancora.
 */
@Injectable({ providedIn: 'root' })
export class AgentGeneratorService {

  private readonly _isOpen$ = new BehaviorSubject<boolean>(false);
  /** True quando la modale e' aperta: l'interfaccia sottostante va bloccata. */
  readonly isOpen$: Observable<boolean> = this._isOpen$.asObservable();

  private SERVER_BASE_URL: string;
  private project_id: string;
  private tiledeskToken: string;
  private generatorUrl: string = '';
  private generatorKey: string = '';

  private galleryCache$: Observable<UseCaseGallery>;
  private catalogCache$: Observable<any>;

  /** Client senza interceptor: le chiamate al generatore non devono portare credenziali Tiledesk. */
  private readonly externalHttp: HttpClient;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private http: HttpClient,
    httpBackend: HttpBackend,
    private appStorageService: AppStorageService,
    private dashboardService: DashboardService,
    private openaiService: OpenaiService
  ) {
    this.externalHttp = new HttpClient(httpBackend);
  }

  /** Stesso schema di inizializzazione degli altri servizi del CDS, piu' il servizio di generazione. */
  initialize(serverBaseUrl: string, project_id: string, generator: AgentGeneratorConfig = {}): void {
    this.SERVER_BASE_URL = serverBaseUrl;
    this.project_id = project_id;
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
    this.generatorUrl = (generator.url || '').trim().replace(/\/+$/, '');
    this.generatorKey = (generator.key || '').trim();
  }

  /** True se URL e chiave del servizio di generazione sono configurati. */
  get isConfigured(): boolean {
    return !!this.generatorUrl && !!this.generatorKey;
  }

  get isOpen(): boolean {
    return this._isOpen$.value;
  }

  open(): void {
    this.logger.log('[AGENT-GENERATOR] open');
    this._isOpen$.next(true);
  }

  close(): void {
    this.logger.log('[AGENT-GENERATOR] close');
    this._isOpen$.next(false);
  }

  /**
   * La galleria dei casi d'uso, da asset statico. In errore ritorna una
   * galleria vuota: la sezione esempi sparisce ma la modale resta usabile.
   */
  gallery(): Observable<UseCaseGallery> {
    if (!this.galleryCache$) {
      this.galleryCache$ = this.http.get<UseCaseGallery>(GALLERY_ASSET_URL).pipe(
        map(raw => ({
          categories: raw?.categories ?? [],
          cases: raw?.cases ?? []
        })),
        catchError(err => {
          this.logger.error('[AGENT-GENERATOR] gallery load failed: ', err);
          return of(EMPTY_GALLERY);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.galleryCache$;
  }

  /**
   * Un turno del planner conversazionale: manda la conversazione COMPLETA e
   * riceve o una domanda (`ask`) o il piano compilabile (`ready` + `spec`).
   * Il server e' stateless: la memoria vive qui nel client.
   *
   * ⚠️ Non ancora collegato: punta al vecchio endpoint Tiledesk, che non esiste.
   */
  planTurn(messages: PlanMessage[], botType: BOT_TYPE, language: string): Observable<PlanTurn> {
    const url = this.SERVER_BASE_URL + this.project_id + '/chatbots/plan';
    const body = { messages, botType, language };
    this.logger.log('[AGENT-GENERATOR] planTurn URL: ', url, body);
    return this.http.post(url, body, this.httpOptions()).pipe(
      map((res: any) => this.normalizePlanTurn(res))
    );
  }

  /**
   * Genera il Blueprint dell'agente dalla descrizione, che per ora fa da prompt finale.
   * Manda anche il catalogo delle action e i nomi reali di dipartimenti e knowledge base.
   *
   * POST {aiAgentGeneratorUrl}/generate
   */
  generate(description: string, botType: BOT_TYPE, language: string): Observable<GenerateResponse> {
    if (!this.isConfigured) {
      return throwError(() => ({ notConfigured: true }));
    }
    return forkJoin({ catalog: this.catalog(), namespaces: this.namespaceNames() }).pipe(
      switchMap(({ catalog, namespaces }) => {
        const body = {
          projectId: this.project_id,
          botType,
          agentLanguage: language,
          finalPrompt: description,
          catalog,
          context: { departments: this.departmentNames(), namespaces },
          limits: { maxBlocks: MAX_BLOCKS }
        };
        this.logger.log('[AGENT-GENERATOR] generate: ', this.generatorUrl, { ...body, catalog: catalog?.version });
        return this.externalHttp.post<GenerateResponse>(this.generatorUrl + '/generate', body, {
          headers: new HttpHeaders({ 'Content-Type': 'application/json', 'X-Api-Key': this.generatorKey })
        });
      }),
      map(res => ({
        ...res,
        notes: Array.isArray(res?.notes) ? res.notes : [],
        warnings: Array.isArray(res?.warnings) ? res.warnings : []
      }))
    );
  }

  /** Catalogo delle action generabili (copia dell'asset del servizio di generazione). */
  private catalog(): Observable<any> {
    if (!this.catalogCache$) {
      this.catalogCache$ = this.http.get(CATALOG_ASSET_URL).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.catalogCache$;
  }

  private departmentNames(): string[] {
    return (this.dashboardService.departments || []).map(d => d?.name).filter(name => !!name);
  }

  /** Nomi delle knowledge base del progetto; in errore nessuna, la generazione procede. */
  private namespaceNames(): Observable<string[]> {
    return this.openaiService.getAllNamespaces().pipe(
      take(1),
      map(list => (list || []).map(n => n?.name).filter(name => !!name)),
      catchError(err => {
        this.logger.error('[AGENT-GENERATOR] namespaces load failed: ', err);
        return of([]);
      })
    );
  }

  /**
   * Normalizza il turno del planner con default difensivi. Un turno 'ready'
   * senza `spec` non e' compilabile: viene degradato ad 'ask', altrimenti la UI
   * mostrerebbe un piano pronto che non si puo' costruire.
   */
  private normalizePlanTurn(res: any): PlanTurn {
    const plan = res?.plan ?? {};
    const isReady = plan.status === PLAN_STATUS.READY && !!plan.spec;
    return {
      status: isReady ? PLAN_STATUS.READY : PLAN_STATUS.ASK,
      message: plan.message ?? '',
      spec: isReady ? plan.spec : undefined,
      requiredIntegrations: Array.isArray(plan.requiredIntegrations) ? plan.requiredIntegrations : []
    };
  }

  private httpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': this.tiledeskToken
      })
    };
  }
}
