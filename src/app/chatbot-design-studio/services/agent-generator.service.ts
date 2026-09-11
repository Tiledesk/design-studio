import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, defer, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, retry, shareReplay, switchMap, take } from 'rxjs/operators';

import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { DashboardService } from 'src/app/services/dashboard.service';
import { OpenaiService } from 'src/app/services/openai.service';
import { FaqService } from 'src/app/services/faq.service';
import {
  CompileError, GenerationInfo, KnowledgeBaseRef, compileBlueprint
} from 'src/app/chatbot-design-studio/ai-authoring/blueprint-compiler';

/** Tipo di agente da generare: determina l'entry point del flow lato server. */
export enum BOT_TYPE {
  CHAT     = 'chat',
  WEBHOOK  = 'webhook',
  COPILOT  = 'copilot'
}

/** Un messaggio della conversazione col planner (la memoria vive nel client). */
export interface PlanMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Stato di un turno del planner: domanda di chiarimento o prompt finale pronto. */
export enum PLAN_STATUS {
  ASK   = 'ask',
  READY = 'ready'
}

/** Le 11 sezioni del brief, nell'ordine in cui la UI le mostra (endpoint-contract.md §5). */
export const PLAN_SECTION_KEYS: string[] = [
  'goal', 'language_tone', 'opening', 'main_path', 'data_to_collect', 'branching',
  'handoff', 'business_hours', 'knowledge_base', 'fallback', 'closing'
];

export type PlanSectionState = 'defined' | 'unclear' | 'assumed' | 'not_needed';
const PLAN_SECTION_STATES: string[] = ['defined', 'unclear', 'assumed', 'not_needed'];

export interface PlanSection {
  state: PlanSectionState;
  text: string;
}

export interface PlanQuestion {
  text: string;
  options: string[];
  multi: boolean;
}

/** Turno del planner (POST /plan), normalizzato. */
export interface PlanTurn {
  status: PLAN_STATUS;
  /** Riscontro alla risposta precedente; con 'ready' il riepilogo di cosa verra' costruito. */
  message: string;
  /** Con 'ask' la domanda e le sue opzioni; null con 'ready'. */
  question: PlanQuestion | null;
  /** Sempre tutte e 11 le sezioni, ognuna con il suo stato. */
  sections: { [key: string]: PlanSection };
  /** Con 'ready': il brief completo da passare a generate(). */
  finalPrompt: string | null;
  agentLanguage: string | null;
  agentName: string | null;
  assumptions: string[];
  unsupported: string[];
  model?: string;
  promptVersion?: string;
}

/** Cosa si manda al generatore: il prompt finale, eventualmente modificato, e i suoi metadati. */
export interface GenerateBrief {
  finalPrompt: string;
  agentLanguage: string;
  agentName?: string | null;
  sections?: { [key: string]: PlanSection } | null;
}

/**
 * Riassunto dell'intervista salvato nell'agente al posto della conversazione completa:
 * l'engine carica l'agente intero a ogni messaggio, e la conversazione puo' contenere dati personali.
 */
export interface InterviewSummary {
  /** La descrizione iniziale scritta dall'utente. */
  initialPrompt: string;
  /** Domande fatte dal planner. */
  questions: number;
  /** Il prompt finale come l'ha proposto il planner, per sapere se l'utente l'ha modificato. */
  plannerFinalPrompt: string | null;
  promptVersion?: string;
  model?: string;
  assumptions: string[];
  unsupported: string[];
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

/** Agente creato nel progetto. */
export interface CreatedAgent {
  botId: string;
  name: string;
  intents: number;
  /** True se la lettura di controllo degli intent non e' riuscita: l'agente e' creato ma non verificato. */
  unverified?: boolean;
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
/** Domande al massimo: raggiunto il limite, il planner deve chiudere con il prompt finale. */
const MAX_QUESTIONS = 8;
const MAX_OPTIONS = 5;
/** Lunghezza massima di agentName accettata dal generatore. */
const MAX_AGENT_NAME = 60;
/** Lunghezza massima della descrizione iniziale salvata nell'agente (come i messaggi del servizio). */
const MAX_INITIAL_PROMPT = 4000;
/** Riletture dei blocchi dopo l'import: il server risponde prima di averli salvati tutti. */
const VERIFY_READS = 6;
const VERIFY_DELAY_MS = 1000;

/** Traduce un errore del generatore o della creazione dell'agente nel messaggio da mostrare. */
export function describeGeneratorError(err: any): GeneratorFailure {
  const prefix = 'CDSAgentGenerator.';
  if (err?.notConfigured) return { messageKey: prefix + 'ErrorNotConfigured', details: [] };
  if (err instanceof CompileError) return { messageKey: prefix + 'ErrorCompile', details: err.problems };
  if (err?.stage === 'import') {
    const cause = err.cause || {};
    const text = cause.error?.msg || cause.error?.message || cause.message || '';
    return { messageKey: prefix + 'ErrorCreate', details: [`HTTP ${cause.status ?? 0}${text ? ': ' + text : ''}`] };
  }
  if (err?.stage === 'no_id') return { messageKey: prefix + 'ErrorNoAgentId', details: [] };
  if (err?.stage === 'ids') {
    return { messageKey: prefix + 'ErrorIdsNotPreserved', details: [`${err.agentName}: ${err.missing.length}/${err.total}`] };
  }
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
 * Normalizza un turno del planner (endpoint-contract.md §5). Il servizio la applica gia':
 * il DS la ripete per sicurezza, cosi' la UI riceve sempre una forma completa e coerente.
 */
export function normalizePlanTurn(raw: any): PlanTurn {
  const text = (value: any): string => (typeof value === 'string' ? value.trim() : '');
  const texts = (value: any): string[] => (Array.isArray(value) ? value.map(text).filter(s => !!s) : []);
  const message = text(raw?.message);
  const finalPrompt = text(raw?.finalPrompt);
  // Un 'ready' senza prompt finale non si puo' generare: si torna a chiedere.
  const isReady = raw?.status === PLAN_STATUS.READY && !!finalPrompt;
  const sections: { [key: string]: PlanSection } = {};
  PLAN_SECTION_KEYS.forEach(key => {
    const section = raw?.sections?.[key];
    const state = PLAN_SECTION_STATES.includes(section?.state) ? section.state : 'unclear';
    sections[key] = { state, text: text(section?.text) };
  });
  let question: PlanQuestion | null = null;
  if (!isReady) {
    const options = texts(raw?.question?.options).filter((o, i, all) => all.indexOf(o) === i).slice(0, MAX_OPTIONS);
    question = {
      text: text(raw?.question?.text) || message,
      options,
      multi: !!raw?.question?.multi && options.length > 1
    };
  }
  return {
    status: isReady ? PLAN_STATUS.READY : PLAN_STATUS.ASK,
    message,
    question,
    sections,
    finalPrompt: isReady ? finalPrompt : null,
    agentLanguage: isReady ? (text(raw?.agentLanguage) || null) : null,
    agentName: isReady ? (text(raw?.agentName) || null) : null,
    assumptions: texts(raw?.assumptions),
    unsupported: texts(raw?.unsupported),
    model: raw?.model,
    promptVersion: raw?.promptVersion
  };
}

/**
 * Il turno dell'assistente come messaggio della cronologia mandata al planner
 * (endpoint-contract.md §5): messaggio, domanda e "Opzioni: a | b | c".
 */
export function planTurnToMessage(turn: PlanTurn): string {
  const q = turn.question;
  if (!q) return turn.message || turn.finalPrompt || '';
  const question = q.text + (q.options.length ? '\nOpzioni: ' + q.options.join(' | ') : '');
  return turn.message && turn.message !== q.text ? turn.message + '\n\n' + question : question;
}

/**
 * Feature "Crea agente con l'AI".
 *
 * Tre responsabilita':
 * - lo stato di apertura della modale (il pulsante la apre, la modale osserva);
 * - le chiamate al servizio di generazione, esterno a Tiledesk (su Render), con la chiave
 *   `aiAgentGeneratorKey`: `POST {aiAgentGeneratorUrl}/plan` per l'intervista e
 *   `POST {aiAgentGeneratorUrl}/generate` per il Blueprint;
 * - la creazione dell'agente nel progetto: compilazione del Blueprint e import con creazione.
 *
 * Il servizio di generazione non riceve mai il token Tiledesk: le sue chiamate usano un client HTTP
 * senza interceptor. Contratto: docs/V3/ai-authoring/endpoint-contract.md.
 */
@Injectable({ providedIn: 'root' })
export class AgentGeneratorService {

  private readonly _isOpen$ = new BehaviorSubject<boolean>(false);
  /** True quando la modale e' aperta: l'interfaccia sottostante va bloccata. */
  readonly isOpen$: Observable<boolean> = this._isOpen$.asObservable();

  private project_id: string;
  private generatorUrl: string = '';
  private generatorKey: string = '';

  private galleryCache$: Observable<UseCaseGallery>;
  private catalogCache$: Observable<any>;
  /** Knowledge base del progetto: lette una volta per ogni apertura della modale. */
  private knowledgeBasesCache$: Observable<KnowledgeBaseRef[]> | null = null;

  /** Client senza interceptor: le chiamate al generatore non devono portare credenziali Tiledesk. */
  private readonly externalHttp: HttpClient;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private http: HttpClient,
    httpBackend: HttpBackend,
    private dashboardService: DashboardService,
    private openaiService: OpenaiService,
    private faqService: FaqService
  ) {
    this.externalHttp = new HttpClient(httpBackend);
  }

  /** Progetto corrente e servizio di generazione, dalla remote config. */
  initialize(project_id: string, generator: AgentGeneratorConfig = {}): void {
    this.project_id = project_id;
    this.generatorUrl = (generator.url || '').trim().replace(/\/+$/, '');
    this.generatorKey = (generator.key || '').trim();
  }

  /** True se URL e chiave del servizio di generazione sono configurati. */
  get isConfigured(): boolean {
    return !!this.generatorUrl && !!this.generatorKey;
  }

  get projectId(): string {
    return this.project_id;
  }

  get isOpen(): boolean {
    return this._isOpen$.value;
  }

  open(): void {
    this.logger.log('[AGENT-GENERATOR] open');
    this.knowledgeBasesCache$ = null;
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
   * Un turno dell'intervista: manda la conversazione COMPLETA, il cui ultimo messaggio e'
   * dell'utente, e riceve una domanda (`ask`) oppure il prompt finale (`ready`).
   * Il servizio e' stateless: la memoria vive nella modale.
   *
   * POST {aiAgentGeneratorUrl}/plan
   */
  planTurn(messages: PlanMessage[], botType: BOT_TYPE, uiLanguage: string): Observable<PlanTurn> {
    if (!this.isConfigured) {
      return throwError(() => ({ notConfigured: true }));
    }
    return this.projectFacts().pipe(
      switchMap(({ catalog, knowledgeBases }) => {
        const body = {
          projectId: this.project_id,
          botType,
          uiLanguage,
          messages,
          context: {
            catalogIndex: (catalog?.types || []).map((t: any) => ({ type: t.type, purpose: t.purpose })),
            departments: this.departmentNames(),
            namespaces: knowledgeBases.map(kb => kb.name)
          },
          limits: { maxQuestions: MAX_QUESTIONS }
        };
        this.logger.log('[AGENT-GENERATOR] planTurn: ', this.generatorUrl, { messages: messages.length });
        return this.post<any>('/plan', body);
      }),
      map(res => normalizePlanTurn(res))
    );
  }

  /**
   * Genera il Blueprint dal prompt finale. Manda anche il catalogo delle action e i nomi reali
   * di dipartimenti e knowledge base.
   *
   * POST {aiAgentGeneratorUrl}/generate
   */
  generate(brief: GenerateBrief, botType: BOT_TYPE): Observable<GenerateResponse> {
    if (!this.isConfigured) {
      return throwError(() => ({ notConfigured: true }));
    }
    return this.projectFacts().pipe(
      switchMap(({ catalog, knowledgeBases }) => {
        const body = {
          projectId: this.project_id,
          botType,
          agentLanguage: brief.agentLanguage,
          agentName: brief.agentName ? brief.agentName.slice(0, MAX_AGENT_NAME) : undefined,
          finalPrompt: brief.finalPrompt,
          sections: brief.sections || undefined,
          catalog,
          context: { departments: this.departmentNames(), namespaces: knowledgeBases.map(kb => kb.name) },
          limits: { maxBlocks: MAX_BLOCKS }
        };
        this.logger.log('[AGENT-GENERATOR] generate: ', this.generatorUrl, { ...body, catalog: catalog?.version });
        return this.post<GenerateResponse>('/generate', body);
      }),
      map(res => ({
        ...res,
        notes: Array.isArray(res?.notes) ? res.notes : [],
        warnings: Array.isArray(res?.warnings) ? res.warnings : []
      }))
    );
  }

  /**
   * Crea l'agente nel progetto:
   * 1. compila il Blueprint nell'agente V3 (id reali, una action per blocco, nomi validi), con i dati
   *    della generazione e il riassunto dell'intervista in `attributes.aiGeneration`;
   * 2. lo importa con creazione (`/faq_kb/importjson/null/?create=true`);
   * 3. rilegge i blocchi creati e verifica che il server abbia conservato gli `intent_id`,
   *    da cui dipendono tutti i collegamenti (spike F0, controllo C3).
   * Se nessuna rilettura riesce, l'agente e' comunque creato: lo si apre, segnato come non verificato.
   */
  createAgent(result: GenerateResponse, brief: GenerateBrief, interview?: InterviewSummary): Observable<CreatedAgent> {
    return this.projectFacts().pipe(
      map(({ catalog, knowledgeBases }) => compileBlueprint(result.blueprint, {
        name: brief.agentName || result.blueprint.name,
        departments: this.departmentNames(),
        namespaces: knowledgeBases,
        generation: {
          finalPrompt: brief.finalPrompt,
          model: result.model,
          promptVersion: result.promptVersion,
          catalogVersion: catalog?.version,
          ...this.interviewInfo(brief, interview)
        }
      })),
      switchMap(agent => {
        this.logger.log('[AGENT-GENERATOR] createAgent: import ', { name: agent.name, intents: agent.intents.length });
        return this.faqService.importChatbotFromJSONFromScratch(agent).pipe(
          catchError(cause => throwError(() => ({ stage: 'import', cause }))),
          map((res: any) => ({ agent, botId: res?._id || res?.id || res?.bot?._id }))
        );
      }),
      switchMap(({ agent, botId }) => {
        if (!botId) return throwError(() => ({ stage: 'no_id' }));
        const created: CreatedAgent = { botId, name: agent.name, intents: agent.intents.length };
        return this.missingIntents(botId, agent.intents.map(intent => intent.intent_id)).pipe(
          switchMap(missing => {
            if (missing === null) return of({ ...created, unverified: true });
            if (missing.length) {
              return throwError(() => ({ stage: 'ids', botId, agentName: agent.name, missing, total: agent.intents.length }));
            }
            return of(created);
          })
        );
      })
    );
  }

  /**
   * Gli `intent_id` compilati che il server non ha salvato. Il server risponde all'import prima di aver
   * salvato tutti i blocchi, quindi la rilettura si ripete (fino a VERIFY_READS volte, a VERIFY_DELAY_MS
   * di distanza) finche' ci sono tutti. Emette la lista vuota se ci sono tutti, gli id ancora mancanti
   * dopo l'ultima rilettura, oppure null se l'ultima rilettura non e' riuscita.
   */
  private missingIntents(botId: string, expected: string[]): Observable<string[] | null> {
    let reads = 0;
    let missing: string[] = [];
    return defer(() => {
      reads++;
      return this.faqService.getAllFaqByFaqKbId(botId);
    }).pipe(
      map((intents: any[]) => {
        const saved = new Set((intents || []).map(intent => intent?.intent_id));
        missing = expected.filter(id => !saved.has(id));
        if (missing.length) throw { incomplete: true };
        this.logger.log('[AGENT-GENERATOR] createAgent: all intents saved, reads: ', reads);
        return missing;
      }),
      retry({ count: VERIFY_READS - 1, delay: VERIFY_DELAY_MS }),
      catchError(err => {
        if (err?.incomplete) {
          this.logger.error('[AGENT-GENERATOR] createAgent: intents still missing after reads: ', reads, missing);
          return of(missing);
        }
        this.logger.error('[AGENT-GENERATOR] createAgent: verification read failed ', err);
        return of(null);
      })
    );
  }

  /** Riassunto dell'intervista per aiGeneration: niente conversazione completa. */
  private interviewInfo(brief: GenerateBrief, interview?: InterviewSummary): GenerationInfo {
    if (!interview) return {};
    return {
      initialPrompt: interview.initialPrompt.slice(0, MAX_INITIAL_PROMPT),
      finalPromptEdited: interview.plannerFinalPrompt != null && brief.finalPrompt.trim() !== interview.plannerFinalPrompt.trim(),
      interview: { questions: interview.questions, promptVersion: interview.promptVersion, model: interview.model },
      assumptions: interview.assumptions,
      unsupported: interview.unsupported
    };
  }

  /** Catalogo delle action e knowledge base del progetto: servono a tutte le chiamate. */
  private projectFacts(): Observable<{ catalog: any; knowledgeBases: KnowledgeBaseRef[] }> {
    if (!this.knowledgeBasesCache$) {
      this.knowledgeBasesCache$ = this.knowledgeBases().pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return forkJoin({ catalog: this.catalog(), knowledgeBases: this.knowledgeBasesCache$ });
  }

  private post<T>(path: string, body: any): Observable<T> {
    return this.externalHttp.post<T>(this.generatorUrl + path, body, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'X-Api-Key': this.generatorKey })
    });
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

  /** Knowledge base del progetto, con id e nome; in errore nessuna, e l'intervista procede. */
  private knowledgeBases(): Observable<KnowledgeBaseRef[]> {
    return this.openaiService.getAllNamespaces().pipe(
      take(1),
      map(list => (list || []).filter(n => !!n?.id && !!n?.name).map(n => ({ id: n.id, name: n.name }))),
      catchError(err => {
        this.logger.error('[AGENT-GENERATOR] namespaces load failed: ', err);
        return of([]);
      })
    );
  }
}
