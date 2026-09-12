import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject, Subscription, interval } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

import {
  AgentGeneratorService, BOT_TYPE, Blueprint, BlueprintBlock, CreatedAgent, GenerateBrief, GenerateResponse,
  InterviewSummary, PLAN_SECTION_KEYS, PLAN_STATUS, PlanMessage, PlanTurn, UseCase, describeGeneratorError, planTurnToMessage
} from 'src/app/chatbot-design-studio/services/agent-generator.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

/** Quante card della galleria si vedono prima di "Mostra altri". */
const VISIBLE_CASES = 6;

/** Chip "Tutti": non e' una categoria, e' l'assenza di filtro. */
const CATEGORY_ALL = 'all';

/** Quanti dettagli d'errore del servizio si mostrano sotto il messaggio. */
const MAX_ERROR_DETAILS = 5;

/** Lunghezza massima del nome dell'agente accettata dal generatore. */
const MAX_AGENT_NAME = 60;

/** Etichette delle uscite con nome di un blocco, nell'anteprima. */
const EXIT_LABEL_KEYS: { [name: string]: string } = {
  true: 'IfTrue', false: 'IfFalse', each: 'ExitEach', done: 'ExitDone', fallback: 'ExitFallback', error: 'ExitError'
};

/**
 * Bozza della modale in sessionStorage: chiudere la modale o ricaricare la pagina (il DS lo fa cambiando
 * agente) non perde l'intervista. Vive nella scheda del browser, per progetto, al massimo un giorno.
 */
const DRAFT_KEY = 'cds-agent-generator-draft';
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface Draft {
  projectId: string;
  botType: BOT_TYPE;
  phase: PHASE;
  draft: string;
  messages: PlanMessage[];
  chat: ChatEntry[];
  turn: PlanTurn | null;
  /** True se si stava aspettando un turno del planner: alla ripresa si offre «Riprova». */
  awaitingTurn: boolean;
  questionsAsked: number;
  plannerFinalPrompt: string | null;
  finalPrompt: string;
  agentName: string;
  savedAt: number;
}

/**
 * Fasi della modale: descrizione → intervista → prompt finale → generazione → anteprima → creazione.
 * Dall'anteprima si torna al prompt finale, dal prompt finale alle domande.
 */
export enum PHASE {
  COMPOSE    = 'compose',
  INTERVIEW  = 'interview',
  BRIEF      = 'brief',
  GENERATING = 'generating',
  PREVIEW    = 'preview'
}

/** Un messaggio della chat dell'intervista, come lo mostra la UI. */
interface ChatEntry {
  role: 'user' | 'assistant';
  message: string;
  /** Solo per l'assistente: la domanda, evidenziata sotto il messaggio. */
  question: string;
}

/** Un'uscita di un blocco nell'anteprima: etichetta ("poi", "se sì", "[Bottone]") e destinazione. */
interface PreviewExit {
  label: string;
  target: string;
}

/** Un blocco del Blueprint pronto per l'anteprima. */
interface PreviewBlock {
  id: string;
  name: string;
  typeLabelKey: string;
  detail: string;
  exits: PreviewExit[];
  isStart: boolean;
}

@Component({
  selector: 'cds-agent-generator',
  templateUrl: './cds-agent-generator.component.html',
  styleUrls: ['./cds-agent-generator.component.scss']
})
export class CdsAgentGeneratorComponent implements OnInit, OnDestroy {

  @ViewChild('chatLog') chatLog?: ElementRef<HTMLElement>;

  BOT_TYPE = BOT_TYPE;
  CATEGORY_ALL = CATEGORY_ALL;
  PHASE = PHASE;
  PLAN_STATUS = PLAN_STATUS;
  SECTION_KEYS = PLAN_SECTION_KEYS;
  MAX_AGENT_NAME = MAX_AGENT_NAME;

  /** Tipo di agente: determina l'entry point del flow generato. */
  botType: BOT_TYPE = BOT_TYPE.CHAT;
  botTypeOptions = [
    { value: BOT_TYPE.CHAT,    labelKey: 'CDSAgentGenerator.BotType.Chat',    icon: 'chat_bubble_outline' },
    { value: BOT_TYPE.WEBHOOK, labelKey: 'CDSAgentGenerator.BotType.Webhook', icon: 'webhook' },
    { value: BOT_TYPE.COPILOT, labelKey: 'CDSAgentGenerator.BotType.Copilot', icon: 'add_box' }
  ];

  /** La descrizione iniziale scritta dall'utente. */
  draft: string = '';

  /** Galleria dei casi d'uso. */
  allCases: UseCase[] = [];
  filteredCases: UseCase[] = [];
  categories: string[] = [];
  selectedCategory: string = CATEGORY_ALL;
  showAllCases: boolean = false;

  phase: PHASE = PHASE.COMPOSE;
  errorMessage: string = '';
  errorDetails: string[] = [];
  /** Secondi dall'invio: la generazione dura da qualche secondo a un paio di minuti. */
  elapsedSeconds: number = 0;

  /** Intervista: la cronologia per il servizio e la chat per la UI. */
  messages: PlanMessage[] = [];
  chat: ChatEntry[] = [];
  /** L'ultimo turno del planner. */
  turn: PlanTurn | null = null;
  planning: boolean = false;
  /** Turno fallito: si puo' solo ripetere o ricominciare, cosi' la cronologia resta alternata. */
  canRetry: boolean = false;
  answer: string = '';
  selectedOptions: string[] = [];
  /** Domande fatte dal planner: vanno nel riassunto salvato nell'agente. */
  questionsAsked: number = 0;
  /** Il prompt finale come l'ha proposto il planner, per sapere se l'utente l'ha modificato. */
  plannerFinalPrompt: string | null = null;

  /** Prompt finale: lo propone il planner, l'utente puo' modificarlo. */
  finalPrompt: string = '';
  agentName: string = '';

  /** Anteprima. */
  result: GenerateResponse | null = null;
  flow: PreviewBlock[] = [];
  fallbackTarget: string = '';
  generationSeconds: number = 0;
  showJson: boolean = false;
  copied: boolean = false;
  /** Creazione dell'agente in corso, dall'anteprima. */
  creating: boolean = false;

  private timer: Subscription | null = null;
  private unsubscribe$: Subject<any> = new Subject<any>();
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public dialogRef: MatDialogRef<CdsAgentGeneratorComponent>,
    private agentGeneratorService: AgentGeneratorService,
    private translate: TranslateService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.restoreDraft();
    this.agentGeneratorService.gallery()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(gallery => {
        this.allCases = gallery.cases ?? [];
        this.categories = gallery.categories ?? [];
        this.applyFilter();
      });
  }

  ngOnDestroy(): void {
    this.saveDraft(this.planning);
    this.stopTimer();
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

  /**
   * L'interfaccia sotto la modale e' bloccata dal backdrop, ma gli ascoltatori
   * da tastiera del canvas sono su `document` e riceverebbero comunque i tasti
   * digitati qui dentro: li fermiamo alla radice della modale.
   */
  @HostListener('keydown', ['$event'])
  stopKeyboardPropagation(event: KeyboardEvent): void {
    event.stopPropagation();
  }

  /** Generazione o creazione in corso: la modale non si chiude e i comandi sono bloccati. */
  get isSubmitting(): boolean {
    return this.phase === PHASE.GENERATING || this.creating;
  }

  /** Lingua dell'interfaccia: le domande e il prompt finale arrivano in questa lingua. */
  private get uiLanguage(): string {
    return this.translate.currentLang || this.translate.getDefaultLang() || 'en';
  }

  // -------------------------------------------------------
  // Tipo di agente
  // -------------------------------------------------------
  /** Nella prima versione il generatore costruisce solo agenti Chat. */
  isBotTypeAvailable(value: BOT_TYPE): boolean {
    return value === BOT_TYPE.CHAT;
  }

  selectBotType(value: BOT_TYPE): void {
    if (!this.isBotTypeAvailable(value)) return;
    this.botType = value;
  }

  // -------------------------------------------------------
  // Galleria
  // -------------------------------------------------------
  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.showAllCases = false;
    this.applyFilter();
  }

  /** Il click su una card inietta il meta-prompt nella textarea. */
  useExample(useCase: UseCase): void {
    this.draft = useCase.prompt;
    this.clearError();
  }

  toggleShowAll(): void {
    this.showAllCases = !this.showAllCases;
  }

  get visibleCases(): UseCase[] {
    return this.showAllCases ? this.filteredCases : this.filteredCases.slice(0, VISIBLE_CASES);
  }

  get hiddenCasesCount(): number {
    return Math.max(0, this.filteredCases.length - VISIBLE_CASES);
  }

  /** Etichetta della categoria: chiave i18n se nota, altrimenti il valore grezzo. */
  categoryLabelKey(category: string): string {
    return 'CDSAgentGenerator.Category.' + category;
  }

  private applyFilter(): void {
    this.filteredCases = this.selectedCategory === CATEGORY_ALL
      ? this.allCases
      : this.allCases.filter(c => c.category === this.selectedCategory);
  }

  // -------------------------------------------------------
  // Descrizione → intervista
  // -------------------------------------------------------
  get canSubmit(): boolean {
    return !this.planning && this.draft.trim().length > 0;
  }

  /** La descrizione iniziale apre l'intervista: e' il primo messaggio della conversazione. */
  onSubmit(): void {
    if (!this.canSubmit) return;
    this.clearError();
    if (!this.agentGeneratorService.isConfigured) {
      this.errorMessage = this.translate.instant('CDSAgentGenerator.ErrorNotConfigured');
      return;
    }
    const description = this.draft.trim();
    this.messages = [{ role: 'user', content: description }];
    this.chat = [{ role: 'user', message: description, question: '' }];
    this.turn = null;
    this.answer = '';
    this.selectedOptions = [];
    this.questionsAsked = 0;
    this.plannerFinalPrompt = null;
    this.phase = PHASE.INTERVIEW;
    this.requestTurn();
    this.saveDraft(true);
  }

  // -------------------------------------------------------
  // Intervista
  // -------------------------------------------------------
  /** Si risponde solo a un turno arrivato, e non durante l'attesa o dopo un errore. */
  get canAnswer(): boolean {
    return !this.planning && !this.canRetry && !!this.turn;
  }

  get canSendAnswer(): boolean {
    return this.canAnswer && (this.answer.trim().length > 0 || this.selectedOptions.length > 0);
  }

  get showOptions(): boolean {
    return this.canAnswer && !!this.turn?.question?.options?.length;
  }

  /** Sezioni gia' risolte: definite, assunte dall'AI o non necessarie. */
  get resolvedSections(): number {
    return this.SECTION_KEYS.filter(key => this.sectionState(key) !== 'unclear').length;
  }

  sectionState(key: string): string {
    return this.turn?.sections?.[key]?.state || 'unclear';
  }

  sectionTooltip(key: string): string {
    const state = this.translate.instant('CDSAgentGenerator.Plan.State.' + this.sectionState(key));
    const text = this.turn?.sections?.[key]?.text;
    return text ? state + ' — ' + text : state;
  }

  isOptionSelected(option: string): boolean {
    return this.selectedOptions.includes(option);
  }

  /** Scelta singola: il click sull'opzione e' la risposta. Scelta multipla: la seleziona. */
  pickOption(option: string): void {
    if (!this.canAnswer || !this.turn?.question) return;
    if (!this.turn.question.multi) {
      this.reply(option);
      return;
    }
    const index = this.selectedOptions.indexOf(option);
    if (index >= 0) this.selectedOptions.splice(index, 1);
    else this.selectedOptions.push(option);
  }

  /** Invia le opzioni scelte e il testo libero, uniti da ", ". */
  sendAnswer(): void {
    if (!this.canSendAnswer) return;
    const content = [...this.selectedOptions, this.answer.trim()].filter(part => !!part).join(', ');
    this.answer = '';
    this.reply(content);
  }

  /** Invio con Enter; Shift+Enter va a capo. */
  onAnswerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.sendAnswer();
    }
  }

  /** "Genera comunque": il planner completa da solo le parti mancanti e chiude con il prompt finale. */
  proceedAnyway(): void {
    if (!this.canAnswer) return;
    this.reply(this.translate.instant('CDSAgentGenerator.Plan.ProceedMessage'));
  }

  retry(): void {
    if (this.planning) return;
    this.requestTurn();
  }

  /** Torna alla descrizione iniziale, che resta modificabile; la conversazione si azzera. */
  restart(): void {
    if (this.planning) return;
    this.messages = [];
    this.chat = [];
    this.turn = null;
    this.answer = '';
    this.selectedOptions = [];
    this.questionsAsked = 0;
    this.plannerFinalPrompt = null;
    this.canRetry = false;
    this.clearError();
    this.phase = PHASE.COMPOSE;
    this.clearDraft();
  }

  /** Dopo un "ready" si puo' tornare alle domande e poi di nuovo al prompt finale, senza perdere le modifiche. */
  openBrief(): void {
    this.clearError();
    this.phase = PHASE.BRIEF;
    this.saveDraft();
  }

  private reply(content: string): void {
    if (!this.turn) return;
    this.messages.push({ role: 'assistant', content: planTurnToMessage(this.turn) }, { role: 'user', content });
    this.chat.push({ role: 'user', message: content, question: '' });
    this.selectedOptions = [];
    this.phase = PHASE.INTERVIEW;
    this.requestTurn();
    this.saveDraft(true);
  }

  private requestTurn(): void {
    this.planning = true;
    this.canRetry = false;
    this.clearError();
    this.scrollChatToEnd();
    this.agentGeneratorService.planTurn(this.messages, this.botType, this.uiLanguage)
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => this.planning = false)
      )
      .subscribe({
        next: (turn: PlanTurn) => {
          this.logger.log('[CDS-AGENT-GENERATOR] plan turn: ', turn);
          this.onTurn(turn);
        },
        error: (err: any) => {
          this.logger.error('[CDS-AGENT-GENERATOR] plan error: ', err);
          this.showError(err);
          this.canRetry = true;
          this.saveDraft(true);
        }
      });
  }

  private onTurn(turn: PlanTurn): void {
    this.turn = turn;
    const question = turn.question && turn.question.text !== turn.message ? turn.question.text : '';
    this.chat.push({ role: 'assistant', message: turn.message, question });
    if (turn.status === PLAN_STATUS.READY) {
      this.finalPrompt = turn.finalPrompt || '';
      this.plannerFinalPrompt = turn.finalPrompt;
      this.agentName = (turn.agentName || '').slice(0, MAX_AGENT_NAME);
      this.phase = PHASE.BRIEF;
      this.saveDraft();
      return;
    }
    this.questionsAsked++;
    this.scrollChatToEnd();
    this.saveDraft();
  }

  private scrollChatToEnd(): void {
    setTimeout(() => {
      const el = this.chatLog?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  // -------------------------------------------------------
  // Prompt finale → generazione
  // -------------------------------------------------------
  get canGenerate(): boolean {
    return !this.isSubmitting && this.finalPrompt.trim().length > 0;
  }

  backToQuestions(): void {
    if (this.isSubmitting) return;
    this.clearError();
    this.phase = PHASE.INTERVIEW;
    this.scrollChatToEnd();
    this.saveDraft();
  }

  generateAgent(): void {
    if (!this.canGenerate) return;
    this.clearError();
    this.saveDraft();
    this.phase = PHASE.GENERATING;
    // Durante l'attesa un click sul backdrop non deve chiudere la modale.
    this.dialogRef.disableClose = true;
    this.startTimer();

    this.agentGeneratorService.generate(this.currentBrief(), this.botType)
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.stopTimer();
          this.dialogRef.disableClose = false;
        })
      )
      .subscribe({
        next: (res: GenerateResponse) => {
          this.logger.log('[CDS-AGENT-GENERATOR] generate response: ', res);
          this.showPreview(res);
        },
        error: (err: any) => {
          this.logger.error('[CDS-AGENT-GENERATOR] generate error: ', err);
          this.phase = PHASE.BRIEF;
          this.showError(err);
        }
      });
  }

  /** Il prompt finale, eventualmente modificato, con lingua, nome e sezioni del planner. */
  private currentBrief(): GenerateBrief {
    return {
      finalPrompt: this.finalPrompt.trim(),
      agentLanguage: this.turn?.agentLanguage || this.uiLanguage,
      agentName: this.agentName.trim() || null,
      sections: this.turn?.sections || null
    };
  }

  /** Riassunto dell'intervista da salvare nell'agente: la conversazione completa resta fuori. */
  private interviewSummary(): InterviewSummary {
    return {
      initialPrompt: this.messages[0]?.content || this.draft.trim(),
      questions: this.questionsAsked,
      plannerFinalPrompt: this.plannerFinalPrompt,
      promptVersion: this.turn?.promptVersion,
      model: this.turn?.model,
      assumptions: this.turn?.assumptions || [],
      unsupported: this.turn?.unsupported || []
    };
  }

  // -------------------------------------------------------
  // Anteprima → creazione
  // -------------------------------------------------------
  backToBrief(): void {
    if (this.creating) return;
    this.clearError();
    this.phase = PHASE.BRIEF;
    this.result = null;
    this.flow = [];
    this.showJson = false;
  }

  regenerate(): void {
    if (this.creating) return;
    this.backToBrief();
    this.generateAgent();
  }

  toggleJson(): void {
    this.showJson = !this.showJson;
  }

  copyJson(): void {
    if (!this.result || !navigator.clipboard) return;
    navigator.clipboard.writeText(JSON.stringify(this.result.blueprint, null, 2)).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 1500);
    });
  }

  /** Crea l'agente dall'anteprima e lo apre. */
  createAgent(): void {
    if (!this.result || this.creating) return;
    this.clearError();
    this.creating = true;
    this.dialogRef.disableClose = true;
    this.agentGeneratorService.createAgent(this.result, this.currentBrief(), this.interviewSummary())
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.creating = false;
          this.dialogRef.disableClose = false;
        })
      )
      .subscribe({
        next: (created: CreatedAgent) => {
          this.logger.log('[CDS-AGENT-GENERATOR] agent created: ', created);
          this.openCreatedAgent(created.botId);
        },
        error: (err: any) => {
          this.logger.error('[CDS-AGENT-GENERATOR] create error: ', err);
          this.showError(err);
        }
      });
  }

  /**
   * Apre il nuovo agente come il selettore dell'agent nell'header: il Design Studio si inizializza
   * una volta sola, quindi dopo la navigazione la pagina si ricarica.
   */
  private openCreatedAgent(botId: string): void {
    this.clearDraft();
    this.dialogRef.close();
    this.router.navigate(['/project', this.agentGeneratorService.projectId, 'chatbot', botId, 'blocks'])
      .then(() => window.location.reload());
  }

  private showPreview(res: GenerateResponse): void {
    this.result = res;
    this.generationSeconds = this.elapsedSeconds;
    this.flow = this.buildFlow(res.blueprint);
    this.fallbackTarget = this.blockName(res.blueprint, res.blueprint.fallbackNext);
    this.showJson = false;
    this.phase = PHASE.PREVIEW;
  }

  /** Il Blueprint come elenco leggibile: tipo, nome, contenuto e dove porta ogni uscita. */
  private buildFlow(blueprint: Blueprint): PreviewBlock[] {
    const label = (key: string) => this.translate.instant('CDSAgentGenerator.Preview.' + key);
    return (blueprint.blocks || []).map((block: BlueprintBlock) => {
      const exits: PreviewExit[] = [];
      (block.buttons || []).forEach(button => {
        if (button.goto) exits.push({ label: `[${button.label}]`, target: this.blockName(blueprint, button.goto) });
        else if (button.url) exits.push({ label: `[${button.label}]`, target: button.url });
      });
      (block.branches || []).forEach(branch => {
        if (branch?.goto) exits.push({ label: `[${branch.label}]`, target: this.blockName(blueprint, branch.goto) });
      });
      if (block.next) exits.push({ label: label('Then'), target: this.blockName(blueprint, block.next) });
      const named = block.exits || {};
      Object.keys(named).forEach(name => {
        exits.push({ label: label(EXIT_LABEL_KEYS[name] || name), target: this.blockName(blueprint, named[name]) });
      });
      const setValue = block.destination
        ? `${block.destination} = ${block.value ?? '{{' + block.fromVariable + '}}'}`
        : null;
      const detail = [
        block.text,
        block.texts?.length ? block.texts.join(' / ') : null,
        block.options?.length ? block.options.join(' · ') : null,
        block.question,
        block.instructions,
        block.when,
        block.department,
        block.knowledgeBase,
        block.bot,
        block.table ? `${block.table}: ${block.operation}` : null,
        block.iterable ? `{{${block.iterable}}} → {{${block.itemVariable}}}` : null,
        block.title,
        block.content,
        block.to ? `${block.to} — ${block.subject}` : null,
        block.tags?.length ? `${block.target}: ${block.tags.join(', ')}` : null,
        block.leadFields?.length ? block.leadFields.map(f => `${f.field} = ${f.value}`).join(' · ') : null,
        block.level ? `${block.level}: ${block.log}` : null,
        block.seconds ? `${block.seconds} s` : null,
        block.variable ? `✕ {{${block.variable}}}` : null,
        block.saveTo ? `→ {{${block.saveTo}}}` : null,
        setValue
      ].filter(part => !!part).join('\n');
      return {
        id: block.id,
        name: block.name || block.id,
        typeLabelKey: 'CDSAgentGenerator.Preview.Type.' + block.type,
        detail,
        exits,
        isStart: block.id === blueprint.start
      };
    });
  }

  private blockName(blueprint: Blueprint, id: string | null | undefined): string {
    if (!id) return '';
    const block = (blueprint.blocks || []).find(b => b.id === id);
    return block?.name || id;
  }

  // -------------------------------------------------------
  // Bozza in sessionStorage
  // -------------------------------------------------------
  /**
   * Salva lo stato della modale. Le fasi di generazione e anteprima si salvano come prompt finale:
   * alla ripresa l'utente rigenera. Con `awaitingTurn` la ripresa offre «Riprova» invece di una domanda vecchia.
   */
  private saveDraft(awaitingTurn: boolean = false): void {
    const phase = this.phase === PHASE.GENERATING || this.phase === PHASE.PREVIEW ? PHASE.BRIEF : this.phase;
    if (phase === PHASE.COMPOSE && !this.draft.trim()) {
      this.clearDraft();
      return;
    }
    const draft: Draft = {
      projectId: this.agentGeneratorService.projectId,
      botType: this.botType,
      phase,
      draft: this.draft,
      messages: this.messages,
      chat: this.chat,
      turn: this.turn,
      awaitingTurn,
      questionsAsked: this.questionsAsked,
      plannerFinalPrompt: this.plannerFinalPrompt,
      finalPrompt: this.finalPrompt,
      agentName: this.agentName,
      savedAt: Date.now()
    };
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (err) {
      this.logger.log('[CDS-AGENT-GENERATOR] draft not saved: ', err);
    }
  }

  private restoreDraft(): void {
    let saved: Draft | null = null;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch (err) {
      saved = null;
    }
    if (!saved || saved.projectId !== this.agentGeneratorService.projectId || Date.now() - (saved.savedAt || 0) > DRAFT_MAX_AGE_MS) return;
    this.logger.log('[CDS-AGENT-GENERATOR] draft restored: ', saved.phase, saved.messages?.length);
    this.botType = saved.botType || BOT_TYPE.CHAT;
    this.draft = saved.draft || '';
    this.messages = Array.isArray(saved.messages) ? saved.messages : [];
    this.chat = Array.isArray(saved.chat) ? saved.chat : [];
    this.turn = saved.turn || null;
    this.questionsAsked = saved.questionsAsked || 0;
    this.plannerFinalPrompt = saved.plannerFinalPrompt ?? null;
    this.finalPrompt = saved.finalPrompt || '';
    this.agentName = saved.agentName || '';
    if (saved.phase === PHASE.BRIEF && this.finalPrompt.trim()) {
      this.phase = PHASE.BRIEF;
    } else if (saved.phase === PHASE.INTERVIEW && this.messages.length) {
      this.phase = PHASE.INTERVIEW;
      if (saved.awaitingTurn || !this.turn) {
        // La risposta del planner non era arrivata: la cronologia resta, si puo' solo riprovare o ricominciare.
        this.turn = null;
        this.canRetry = true;
      }
      this.scrollChatToEnd();
    }
  }

  private clearDraft(): void {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      this.logger.log('[CDS-AGENT-GENERATOR] draft not cleared: ', err);
    }
  }

  // -------------------------------------------------------
  // Utilita'
  // -------------------------------------------------------
  private showError(err: any): void {
    const failure = describeGeneratorError(err);
    this.errorMessage = this.translate.instant(failure.messageKey);
    this.errorDetails = failure.details.slice(0, MAX_ERROR_DETAILS);
  }

  private clearError(): void {
    this.errorMessage = '';
    this.errorDetails = [];
  }

  private startTimer(): void {
    this.stopTimer();
    this.elapsedSeconds = 0;
    this.timer = interval(1000).subscribe(() => this.elapsedSeconds++);
  }

  private stopTimer(): void {
    this.timer?.unsubscribe();
    this.timer = null;
  }

  close(): void {
    if (this.isSubmitting) return;
    this.dialogRef.close();
  }
}
