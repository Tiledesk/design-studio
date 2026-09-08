import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';

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

const GALLERY_ASSET_URL = 'assets/gallery/use-cases.gallery.json';
const EMPTY_GALLERY: UseCaseGallery = { categories: [], cases: [] };

/**
 * Feature "Crea agente con l'AI".
 *
 * Due responsabilita':
 * - lo stato di apertura della modale (il pulsante la apre, la modale osserva);
 * - le chiamate al backend di generazione.
 *
 * ⚠️ Gli endpoint `/chatbots/plan` e `/chatbots/generate` **non esistono ancora**
 * su questo server: i contratti qui sotto ricalcano quelli gia' implementati nel
 * server V4 (`routes/chatbotGeneration.js`) e vengono cablati nello step
 * successivo. Finche' l'endpoint non risponde, la modale mostra l'errore.
 */
@Injectable({ providedIn: 'root' })
export class AgentGeneratorService {

  private readonly _isOpen$ = new BehaviorSubject<boolean>(false);
  /** True quando la modale e' aperta: l'interfaccia sottostante va bloccata. */
  readonly isOpen$: Observable<boolean> = this._isOpen$.asObservable();

  private SERVER_BASE_URL: string;
  private project_id: string;
  private tiledeskToken: string;

  private galleryCache$: Observable<UseCaseGallery>;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private http: HttpClient,
    private appStorageService: AppStorageService
  ) { }

  /** Stesso schema di inizializzazione degli altri servizi del CDS. */
  initialize(serverBaseUrl: string, project_id: string): void {
    this.SERVER_BASE_URL = serverBaseUrl;
    this.project_id = project_id;
    this.tiledeskToken = this.appStorageService.getItem('tiledeskToken');
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
   * POST {apiUrl}/{projectId}/chatbots/plan
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
   * Genera il flow a partire dalla descrizione (o dalla `spec` del planner).
   *
   * POST {apiUrl}/{projectId}/chatbots/generate
   */
  generate(description: string, botType: BOT_TYPE, language: string, requiredIntegrations: string[] = []): Observable<any> {
    const url = this.SERVER_BASE_URL + this.project_id + '/chatbots/generate';
    const body: any = { description, botType, language };
    if (requiredIntegrations.length > 0) {
      body.requiredIntegrations = requiredIntegrations;
    }
    this.logger.log('[AGENT-GENERATOR] generate URL: ', url, body);
    return this.http.post(url, body, this.httpOptions());
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
