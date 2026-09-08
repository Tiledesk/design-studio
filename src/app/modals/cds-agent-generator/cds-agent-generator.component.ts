import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

import { AgentGeneratorService, BOT_TYPE, UseCase } from 'src/app/chatbot-design-studio/services/agent-generator.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

/** Quante card della galleria si vedono prima di "Mostra altri". */
const VISIBLE_CASES = 6;

/** Chip "Tutti": non e' una categoria, e' l'assenza di filtro. */
const CATEGORY_ALL = 'all';

@Component({
  selector: 'cds-agent-generator',
  templateUrl: './cds-agent-generator.component.html',
  styleUrls: ['./cds-agent-generator.component.scss']
})
export class CdsAgentGeneratorComponent implements OnInit, OnDestroy {

  BOT_TYPE = BOT_TYPE;
  CATEGORY_ALL = CATEGORY_ALL;

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

  isSubmitting: boolean = false;
  errorMessage: string = '';

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

  // -------------------------------------------------------
  // Tipo di agente
  // -------------------------------------------------------
  selectBotType(value: BOT_TYPE): void {
    if (this.isSubmitting) return;
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
    this.errorMessage = '';
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
  // Invio
  // -------------------------------------------------------
  get canSubmit(): boolean {
    return !this.isSubmitting && this.draft.trim().length > 0;
  }

  onSubmit(): void {
    if (!this.canSubmit) return;
    this.isSubmitting = true;
    this.errorMessage = '';
    const language = this.translate.currentLang || this.translate.getDefaultLang() || 'en';

    this.agentGeneratorService.generate(this.draft.trim(), this.botType, language)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (res: any) => {
          // Lo step successivo consumera' il flow generato: qui ci fermiamo,
          // l'endpoint non e' ancora disponibile su questo server.
          this.logger.log('[CDS-AGENT-GENERATOR] generate response: ', res);
          this.isSubmitting = false;
        },
        error: (err: any) => {
          this.logger.error('[CDS-AGENT-GENERATOR] generate error: ', err);
          this.isSubmitting = false;
          this.errorMessage = err?.status === 404
            ? this.translate.instant('CDSAgentGenerator.ErrorEndpointMissing')
            : this.translate.instant('CDSAgentGenerator.ErrorGeneric');
        }
      });
  }

  close(): void {
    if (this.isSubmitting) return;
    this.dialogRef.close();
  }
}
