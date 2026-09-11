import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject, Subscription, interval } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

import {
  AgentGeneratorService, BOT_TYPE, Blueprint, BlueprintBlock, GenerateResponse, UseCase, describeGeneratorError
} from 'src/app/chatbot-design-studio/services/agent-generator.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

/** Quante card della galleria si vedono prima di "Mostra altri". */
const VISIBLE_CASES = 6;

/** Chip "Tutti": non e' una categoria, e' l'assenza di filtro. */
const CATEGORY_ALL = 'all';

/** Quanti dettagli d'errore del servizio si mostrano sotto il messaggio. */
const MAX_ERROR_DETAILS = 5;

/** Fasi della modale: descrizione, attesa della generazione, anteprima del Blueprint. */
export enum PHASE {
  COMPOSE    = 'compose',
  GENERATING = 'generating',
  PREVIEW    = 'preview'
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

  BOT_TYPE = BOT_TYPE;
  CATEGORY_ALL = CATEGORY_ALL;
  PHASE = PHASE;

  /** Tipo di agente: determina l'entry point del flow generato. */
  botType: BOT_TYPE = BOT_TYPE.CHAT;
  botTypeOptions = [
    { value: BOT_TYPE.CHAT,    labelKey: 'CDSAgentGenerator.BotType.Chat',    icon: 'chat_bubble_outline' },
    { value: BOT_TYPE.WEBHOOK, labelKey: 'CDSAgentGenerator.BotType.Webhook', icon: 'webhook' },
    { value: BOT_TYPE.COPILOT, labelKey: 'CDSAgentGenerator.BotType.Copilot', icon: 'add_box' }
  ];

  /** Il testo scritto dall'utente. */
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

  /** Anteprima. */
  result: GenerateResponse | null = null;
  flow: PreviewBlock[] = [];
  fallbackTarget: string = '';
  generationSeconds: number = 0;
  showJson: boolean = false;
  copied: boolean = false;

  private timer: Subscription | null = null;
  private unsubscribe$: Subject<any> = new Subject<any>();
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public dialogRef: MatDialogRef<CdsAgentGeneratorComponent>,
    private agentGeneratorService: AgentGeneratorService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.agentGeneratorService.gallery()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(gallery => {
        this.allCases = gallery.cases ?? [];
        this.categories = gallery.categories ?? [];
        this.applyFilter();
      });
  }

  ngOnDestroy(): void {
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

  get isSubmitting(): boolean {
    return this.phase === PHASE.GENERATING;
  }

  // -------------------------------------------------------
  // Tipo di agente
  // -------------------------------------------------------
  /** Nella prima versione il generatore costruisce solo agenti Chat. */
  isBotTypeAvailable(value: BOT_TYPE): boolean {
    return value === BOT_TYPE.CHAT;
  }

  selectBotType(value: BOT_TYPE): void {
    if (this.isSubmitting || !this.isBotTypeAvailable(value)) return;
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
    if (this.isSubmitting) return;
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
  // Generazione
  // -------------------------------------------------------
  get canSubmit(): boolean {
    return !this.isSubmitting && this.draft.trim().length > 0;
  }

  onSubmit(): void {
    if (!this.canSubmit) return;
    this.clearError();
    if (!this.agentGeneratorService.isConfigured) {
      this.errorMessage = this.translate.instant('CDSAgentGenerator.ErrorNotConfigured');
      return;
    }
    this.phase = PHASE.GENERATING;
    // Durante l'attesa un click sul backdrop non deve chiudere la modale.
    this.dialogRef.disableClose = true;
    this.startTimer();
    const language = this.translate.currentLang || this.translate.getDefaultLang() || 'en';

    this.agentGeneratorService.generate(this.draft.trim(), this.botType, language)
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
          const failure = describeGeneratorError(err);
          this.phase = PHASE.COMPOSE;
          this.errorMessage = this.translate.instant(failure.messageKey);
          this.errorDetails = failure.details.slice(0, MAX_ERROR_DETAILS);
        }
      });
  }

  // -------------------------------------------------------
  // Anteprima
  // -------------------------------------------------------
  backToCompose(): void {
    this.phase = PHASE.COMPOSE;
    this.result = null;
    this.flow = [];
    this.showJson = false;
  }

  regenerate(): void {
    this.backToCompose();
    this.onSubmit();
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
      if (block.next) exits.push({ label: label('Then'), target: this.blockName(blueprint, block.next) });
      if (block.exits) {
        exits.push({ label: label('IfTrue'), target: this.blockName(blueprint, block.exits.true) });
        exits.push({ label: label('IfFalse'), target: this.blockName(blueprint, block.exits.false) });
      }
      const setValue = block.destination
        ? `${block.destination} = ${block.value ?? '{{' + block.fromVariable + '}}'}`
        : null;
      const detail = [
        block.text,
        block.options?.length ? block.options.join(' · ') : null,
        block.saveTo ? `→ {{${block.saveTo}}}` : null,
        block.when,
        block.question,
        block.department,
        block.knowledgeBase,
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
  // Utilita'
  // -------------------------------------------------------
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
