import { animate, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslateService } from '@ngx-translate/core';
import { WebhookService } from 'src/app/chatbot-design-studio/services/webhook-service.service';
import { CdsModalActivateBotComponent } from 'src/app/modals/cds-modal-activate-bot/cds-modal-activate-bot.component';
import { Department } from 'src/app/models/department-model';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { Intent } from 'src/app/models/intent-model';
import { AppConfigService } from 'src/app/services/app-config';

import { DashboardService } from 'src/app/services/dashboard.service';
import { SavingStateService } from 'src/app/services/saving-state.service';
import { DepartmentService } from 'src/app/services/department.service';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { NotifyService } from 'src/app/services/notify.service';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { sortSubagentsByName } from '../cds-panel-subagents/cds-panel-subagents.component';

/** Una riga dell'elenco da pubblicare: il parent o uno dei suoi subagent. */
export interface PublishTarget {
  _id: string;
  name: string;
  /** Lo stato che dice il server, non il flag locale: vedi loadFamily(). */
  modified: boolean;
  isParent: boolean;
  selected: boolean;
  outcome?: 'success' | 'error';
  error?: string;
}

/**
 * Costruisce l'elenco da mostrare: il parent in testa, i subagent ordinati per nome,
 * e la casella accesa dove ci sono modifiche non pubblicate.
 *
 * Pura ed esportata apposta: e' la regola di preselezione, ed e' la cosa che ha piu'
 * senso poter provare senza montare il componente.
 */
export function buildPublishTargets(parent: any, subagents: any[]): PublishTarget[] {
  const toTarget = (bot: any, isParent: boolean): PublishTarget => ({
    _id: bot?._id,
    name: bot?.name || '',
    modified: bot?.modified === true,
    isParent,
    selected: bot?.modified === true
  });
  const children = sortSubagentsByName((subagents || []).filter(s => s?._id))
    .map(s => toTarget(s, false));
  return parent?._id ? [toTarget(parent, true), ...children] : children;
}

/**
 * Cosa viene pubblicato alla conferma.
 *
 * Con dei subagent l'elenco e' visibile e vale la selezione. Senza, non c'e' elenco e non
 * c'e' niente da scegliere: si pubblica l'agent aperto **anche se non risulta modificato**,
 * come si e' sempre potuto fare. Legare anche quel caso alla selezione renderebbe
 * impubblicabile un agent gia' allineato, che prima dei subagent si pubblicava e basta.
 */
export function resolveTargetsToPublish(targets: PublishTarget[]): PublishTarget[] {
  const hasSubagents = (targets || []).some(t => !t.isParent);
  return hasSubagents ? targets.filter(t => t.selected) : (targets || []);
}

@Component({
  selector: 'cds-panel-publish',
  templateUrl: './cds-panel-publish.component.html',
  styleUrls: ['./cds-panel-publish.component.scss'],
  // animations: [
  //   trigger('progressAnimation', [
  //     transition(':enter', [
  //       style({ strokeDashoffset: 565.48, stroke: 'red' }),
  //       animate('2s', style({ strokeDashoffset: '0', stroke: 'green' })),
  //     ]),
  //   ]),
  //   trigger('rocketMove', [
  //     transition(':enter', [
  //       style({ transform: 'translate(100px, 100px)' }),
  //       animate('1s 4s', style({ transform: 'translate(180px, 180px)' })),
  //     ]),
  //     transition(':leave', [
  //       animate('0.5s', style({ opacity: 0 })),
  //     ]),
  //   ]),
  //   trigger('checkMark', [
  //     transition(':enter', [
  //       style({ opacity: 0, transform: 'translate(-50%, -50%)' }),
  //       animate('0.5s 5s', style({ opacity: 1, transform: 'translate(-50%, -50%)' })),
  //     ]),
  //   ]),
  // ],

})

export class CdsPanelPublishComponent implements OnInit, OnDestroy {
  @ViewChild('tooltip') tooltip: MatTooltip;
  @Output() closePanel = new EventEmitter();
  @Output() updateAndSaveAction = new EventEmitter;
  @Input() projectID: string;
  @Input() selectedChatbot: Chatbot;
  @Input() intent: Intent;
  // @Input() departments: Department[];
  //  selectedChatbot: Chatbot;
  departments: Department[];
  // maximize: boolean = false;

  private releaseNote: string;

  // project_id: string;
  // departments: Department[];
  defaultDepartmentId: string;

  depts_without_bot_array = [];
  selected_dept_name: string;
  deptSelected: { id: string, name: string };

  DEPTS_HAS_NOT_A_BOT: boolean = false
  HAS_CLICKED_HOOK_BOOT_TO_DEPT: boolean = false;
  HAS_COMPLETED_HOOK_BOOT_TO_DEPT: boolean = false;
  HAS_COMPLETED_HOOK_BOOT_TO_DEPT_SUCCESS: boolean = false;
  HAS_COMPLETED_HOOK_BOOT_TO_DEPT_ERROR: boolean = false;

  HAS_COMPLETED_PUBLISH: boolean = false
  HAS_COMPLETED_PUBLISH_SUCCESS: boolean = false
  HAS_COMPLETED_PUBLISH_ERROR: boolean = false
  PUBLISH_PENDING: boolean = false
  /** true appena parte un salvataggio del flusso o di una nota: disabilita il pulsante */
  isSaving: boolean = false;
  /** true solo se il salvataggio supera i 300ms: mostra spinner + "Saving..." */
  isSavingVisible: boolean = false;
  private subscriptionIsSaving: Subscription;
  private subscriptionIsSavingVisible: Subscription;

  showRocket: boolean = true;
  showCheckMark: boolean = false;


  status: 'pending' | 'success' | 'error' = 'pending';
  animationDuration = 5; // Default 5s, will be updated dynamically
  rocketExitDelay = 5; // Default, dynamically updated
  showResultDelay = 6; // Default, dynamically updated
  isRocketShaking: boolean
  hideInstallButton: boolean

  panelOpenState = false;
  serverBaseURL: string;
  webhookUrl: string;

  /** L'agent e i suoi subagent, con la selezione. */
  publishTargets: PublishTarget[] = [];
  familyParentId: string;
  IS_LOADING_FAMILY: boolean = false;
  HAS_SUBAGENTS_LOAD_ERROR: boolean = false;
  private readonly logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    public dashboardService: DashboardService,
    public dialog: MatDialog,
    private departmentService: DepartmentService,
    public translate: TranslateService,
    private notify: NotifyService,
    private faqKbService: FaqKbService,
    private readonly appStorageService: AppStorageService,
    private readonly webhookService: WebhookService,
    private readonly appConfigService: AppConfigService,
    private readonly savingStateService: SavingStateService,
  ) {

  }

  ngOnInit(): void {
    // this.checkDepartmentsForProjectIdHasBot();
    this.serverBaseURL = this.appConfigService.getConfig().apiUrl;

    /** SUBSCRIBE TO THE GLOBAL SAVING STATE */
    this.subscriptionIsSaving = this.savingStateService.isSaving$.subscribe((saving) => {
      this.isSaving = saving;
    });
    this.subscriptionIsSavingVisible = this.savingStateService.isSavingVisible$.subscribe((visible) => {
      this.isSavingVisible = visible;
    });

    const hasCheckedHideInstall = this.appStorageService.getItem(`hide-install-button-${this.projectID}`);
    this.logger.log('[PUBLISH-PANEL] hascheckedHideInstall', hasCheckedHideInstall)
    if (hasCheckedHideInstall) {
      if (hasCheckedHideInstall === 'true') {
        this.hideInstallButton = true
      } else if (hasCheckedHideInstall === 'false') {
        this.hideInstallButton = false
      }
    } else {
      this.hideInstallButton = false
    }
    this.logger.log('[PUBLISH-PANEL] hideInstallButton', this.hideInstallButton)

    this.loadFamily();
  }

  /**
   * Carica l'agent e i suoi subagent per l'elenco da pubblicare.
   *
   * Il parent si risolve come nel pannello dei subagent: dentro un subagent il
   * riferimento e' `parent_id`, altrimenti e' il chatbot aperto. Cosi' premendo Publish
   * da dentro un subagent si vede e si pubblica tutta la famiglia.
   *
   * Il `modified` si rilegge SEMPRE dal server, anche per il chatbot aperto: quello in
   * memoria viene azzerato dal click sul pulsante Publish, quindi nel momento in cui
   * questo pannello si apre e' gia' falso.
   */
  private loadFamily(): void {
    const current: any = this.selectedChatbot;
    const isSubagent = current?.subtype === 'subagent';
    this.familyParentId = isSubagent ? current?.parent_id : current?._id;

    if (!this.familyParentId) {
      // Senza un parent non c'e' famiglia da mostrare, ma il pannello deve restare
      // utilizzabile: si ripiega sull'agent aperto, com'era prima dei subagent.
      this.logger.error('[PUBLISH-PANEL] no parent id: falling back to the open chatbot');
      this.familyParentId = current?._id;
      this.publishTargets = buildPublishTargets(current, []);
      return;
    }

    this.IS_LOADING_FAMILY = true;
    forkJoin({
      parent: this.faqKbService.getBotById(this.familyParentId).pipe(catchError(() => of(null))),
      // L'errore si annota invece di essere ingoiato: una lista vuota perche' la chiamata
      // e' fallita e' indistinguibile da un agent senza subagent, e nel secondo caso
      // l'elenco sparisce del tutto -- l'utente crederebbe di non averne.
      subagents: this.faqKbService.getSubagentsByFaqKbId(this.familyParentId).pipe(
        catchError((error) => {
          this.logger.error('[PUBLISH-PANEL] subagents load error', error);
          this.HAS_SUBAGENTS_LOAD_ERROR = true;
          return of([]);
        })
      )
    }).subscribe(({ parent, subagents }) => {
      const list: any[] = Array.isArray(subagents) ? subagents : ((subagents as any)?.subagents || (subagents as any)?.data || []);
      // Il parent non risponde: si ripiega su quello che abbiamo, senza `modified`,
      // cosi' l'elenco c'e' comunque e l'utente sceglie a mano.
      const parentBot = parent || (isSubagent ? { _id: this.familyParentId, name: '' } : current);
      this.publishTargets = buildPublishTargets(parentBot, list);
      this.IS_LOADING_FAMILY = false;
      this.logger.log('[PUBLISH-PANEL] family loaded', this.publishTargets);
    });
  }

  toggleTarget(target: PublishTarget): void {
    target.selected = !target.selected;
  }

  /** L'elenco si mostra solo se c'e' qualcosa da scegliere, cioe' se ci sono subagent. */
  get HAS_SUBAGENTS(): boolean {
    return this.publishTargets.filter(t => !t.isParent).length > 0;
  }

  /** Cosa viene pubblicato alla conferma: vedi resolveTargetsToPublish. */
  get targetsToPublish(): PublishTarget[] {
    return resolveTargetsToPublish(this.publishTargets);
  }

  get CAN_PUBLISH(): boolean {
    return !this.IS_LOADING_FAMILY && this.targetsToPublish.length > 0;
  }

  /** Le righe che hanno un esito, cioe' quelle che sono state effettivamente inviate. */
  get publishedTargets(): PublishTarget[] {
    return this.publishTargets.filter(t => t.outcome);
  }

  /**
   * Nessuno ha modifiche da pubblicare: lo si dice, invece di lasciare un pulsante spento
   * e muto. Vale solo quando c'e' un elenco: senza subagent il pulsante resta attivo.
   */
  get HAS_NOTHING_TO_PUBLISH(): boolean {
    return !this.IS_LOADING_FAMILY
      && this.HAS_SUBAGENTS
      && this.publishTargets.every(t => !t.modified);
  }



  ngOnDestroy(): void {
    // il componente sta dentro un *ngIf: viene distrutto e ricreato a ogni apertura
    // del pannello, quindi senza unsubscribe le subscription si accumulerebbero
    this.subscriptionIsSaving?.unsubscribe();
    this.subscriptionIsSavingVisible?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.logger.log('[PUBLISH-PANEL] intent', this.intent)
    //  this.logger.log('[PUBLISH-PANEL] ngOnChanges projectID', this.projectID)
    this.logger.log('[PUBLISH-PANEL] ngOnChanges selectedChatbot', this.selectedChatbot)
    if (!this.selectedChatbot?.subtype || this.selectedChatbot?.subtype === "chatbot") {
      this.checkDepartmentsForProjectIdHasBot();
    }
    if (this.selectedChatbot?.subtype && (this.selectedChatbot?.subtype === "webhook" || this.selectedChatbot?.subtype === "copilot")) {
      this.getWebhook()
    }
  }

  getWebhook() {
    this.webhookService.getWebhook(this.selectedChatbot._id).subscribe(
      {
        next: (resp: any) => {
          this.logger.log("[PUBLISH-PANEL] getWebhook : ", resp);
          this.webhookUrl = this.serverBaseURL + 'webhook/' + resp.webhook_id;
          this.logger.log('[PUBLISH-PANEL] webhookUrl  ', this.webhookUrl)
        }, error: (error) => {
          this.logger.error("[PUBLISH-PANEL] error getWebhook: ", error);
        
        }, complete: () => {
          this.logger.log("[PUBLISH-PANEL] getWebhook completed.");
        }
      });
  }

  copyToClipboard(value: string): void {
    navigator.clipboard.writeText(value).then(() => {
      this.tooltip.disabled = false;
      this.tooltip.show();

      setTimeout(() => {
        this.tooltip.hide();
        this.tooltip.disabled = true;
      }, 1000);
    });
  }

  checkDepartmentsForProjectIdHasBot() {
    this.departmentService.getDeptsByProjectId().subscribe({
      next: (departments: any) => {
        // this.selectedChatbot = this.dashboardService.selectedChatbot;

        this.logger.log('[PUBLISH-PANEL] checkDepartmentsForProjectIdHasBot selectedChatbot ', this.selectedChatbot)
        if (departments) {
          this.departments = departments
          this.logger.log('[PUBLISH-PANEL] checkDepartmentsForProjectIdHasBot departments ', this.departments)
          this.departments.forEach((dept: Department) => {
            if (dept.default === true) {
              this.defaultDepartmentId = dept._id;
              this.logger.log('[PUBLISH-PANEL] - DEFAULT DEPT ID ', this.defaultDepartmentId);
            }
          })
          const depts_length = this.departments.length
          this.logger.log('[PUBLISH-PANEL] ---> GET DEPTS DEPTS LENGHT ', depts_length);

          //CASE: selected bot is already connected with a dep --> not show select or automatic active bot 
          const hasFoundBotIn = this.departments.filter((dept: any) => {

            return dept.id_bot === this.selectedChatbot._id;
          });
          this.logger.log('[PUBLISH-PANEL] ---> hasFoundBotIn ', hasFoundBotIn);
          if (hasFoundBotIn.length > 0) {
            this.HAS_COMPLETED_HOOK_BOOT_TO_DEPT = true
            this.HAS_COMPLETED_HOOK_BOOT_TO_DEPT_SUCCESS = true;
            return;
          }

          //CASE: project has only 1 dept --> set this as the department to associate bot with
          if (depts_length === 1) {
            this.logger.log('[PUBLISH-PANEL] --->  USE CASE PROJECT HAS 1 DEP  ');
            // this.DISPLAY_SELECT_DEPTS_WITHOUT_BOT = false;
            this.deptSelected = { id: this.departments[0]._id, name: this.departments[0].name }

            this.logger.log('[PUBLISH-PANEL]  --->  DEFAULT DEPT HAS BOT ', this.departments[0].hasBot);
            if (!this.departments[0].hasBot) {
              this.hookBotToDept()
              this.logger.log('[PUBLISH-PANEL] --->  DEFAULT DEPT HAS BOT ');
              // this.DISPLAY_BTN_ACTIVATE_BOT_FOR_NEW_CONV = false;
            }
          }

          //CASE: project has more than 1 dept --> show select with departments with no bot associated with
          if (depts_length > 1) {
            this.logger.log('[PUBLISH-PANEL] --->  USE CASE PROJECT HAS MORE THAN 1 DEP  ');
            this.departments.forEach(dept => {
              if (!dept.hasBot) {
                this.DEPTS_HAS_NOT_A_BOT = true
                this.depts_without_bot_array.push({ id: dept._id, name: dept.name })
              }
            });

          }

        }
      }, error: (error) => {

        this.logger.error('[PUBLISH-PANEL] - DEPT - GET DEPTS  - ERROR', error);
      }, complete: () => {
        this.logger.log('[PUBLISH-PANEL] - DEPT - GET DEPTS - COMPLETE')

      }
    })
  }

  onSelectDept(event: { id: string, name: string }) {
    this.logger.log('[PUBLISH-PANEL] --->  onSelectDept ', event);
    this.deptSelected = event
    this.logger.log('[PUBLISH-PANEL] --->  deptSelected ', this.deptSelected);
  }

  hookBotToDept() {
    this.HAS_CLICKED_HOOK_BOOT_TO_DEPT = true;
    this.departmentService.updateExistingDeptWithSelectedBot(this.deptSelected.id, this.selectedChatbot._id)
      .subscribe({
        next: (res) => {
          this.logger.log('[PUBLISH-PANEL] Bot Create - UPDATE EXISTING DEPT WITH SELECED BOT - RES ', res);
        }, error: (error) => {
          this.logger.error('[PUBLISH-PANEL] Bot Create - UPDATE EXISTING DEPT WITH SELECED BOT - ERROR ', error);

          this.HAS_COMPLETED_HOOK_BOOT_TO_DEPT = true
          this.HAS_COMPLETED_HOOK_BOOT_TO_DEPT_ERROR = true;

          console.error('[PUBLISH-PANEL] Bot Create - UPDATE EXISTING DEPT WITH SELECED BOT - ERROR - HAS_COMPLETED_HOOK_BOOT_TO_DEPT', this.HAS_COMPLETED_HOOK_BOOT_TO_DEPT);
          this.notify.showWidgetStyleUpdateNotification(this.translate.instant('CDSSetting.UpdateBotError'), 4, 'report_problem');
        }, complete: () => {
          this.logger.log('[BOT-CREATE] Bot Create - UPDATE EXISTING DEPT WITH SELECED BOT - COMPLETE ');

          this.HAS_COMPLETED_HOOK_BOOT_TO_DEPT = true
          this.HAS_COMPLETED_HOOK_BOOT_TO_DEPT_SUCCESS = true;

          this.notify.showWidgetStyleUpdateNotification(this.translate.instant('CDSModalActivateBot.BotSuccessfullyActivated', { name: this.deptSelected.name }), 2, 'done');

          this.logger.log('[PUBLISH-PANEL] Bot Create - UPDATE EXISTING DEPT WITH SELECED BOT - COMPLETE - HAS_COMPLETED_HOOK_BOOT_TO_DEPT', this.HAS_COMPLETED_HOOK_BOOT_TO_DEPT);
        }
      });
  }


  changeTextarea($event: string) {
    this.logger.log("[PUBLISH-PANEL] changeTextarea event", $event)
    this.releaseNote = $event;
    this.logger.log("[PUBLISH-PANEL] changeTextarea releaseNote", this.releaseNote)
    // this.action[property] = $event
    // this.updateAndSaveAction.emit({type: TYPE_UPDATE_ACTION.ACTION, element: this.action});
  }

  onClickPublish() {
    // Non pubblicare se c'e' un salvataggio in volo (stato non ancora persistito)
    // ne' se una publish e' gia' partita: oggi un doppio click invia due publish.
    if (this.isSaving || this.PUBLISH_PENDING) { return; }
    // Ne' se non c'e' niente di selezionato da pubblicare.
    if (!this.CAN_PUBLISH) { return; }

    this.PUBLISH_PENDING = true
    this.status = 'pending';

    const selected = this.targetsToPublish;
    const ids = selected.map(t => t._id);
    this.logger.log('[PUBLISH-PANEL] publishing', ids);

    this.faqKbService.publishMulti(this.familyParentId, ids, this.releaseNote).subscribe({
      next: (data: any) => {
        this.logger.log('[PUBLISH-PANEL] publish multi - RES ', data)
        this.applyResults(data?.results);
        this.status = 'success';
        this.HAS_COMPLETED_PUBLISH = true;
        this.HAS_COMPLETED_PUBLISH_SUCCESS = true;
      },
      error: (error) => {
        // Un solo fallimento vale 500, ma `results` arriva comunque: senza leggerlo
        // l'utente vedrebbe "errore" anche quando meta' dei chatbot sono stati pubblicati.
        this.logger.error('[PUBLISH-PANEL] publish multi ERROR ', error);
        if (Array.isArray(error?.error?.results)) {
          this.applyResults(error.error.results);
        } else {
          // Nessun esito per elemento: la richiesta non e' nemmeno arrivata al ciclo di
          // pubblicazione (body rifiutato, rete, permessi), quindi non e' stato pubblicato
          // niente. Dirlo su ogni riga e' piu' onesto di un elenco vuoto.
          const message = error?.error?.message || error?.message || '';
          this.applyResults(selected.map(t => ({ id: t._id, success: false, error: message })));
        }
        this.status = 'error';
        this.PUBLISH_PENDING = false;
        this.HAS_COMPLETED_PUBLISH = true;
        this.HAS_COMPLETED_PUBLISH_ERROR = true;
      }
    });
  }

  /**
   * Riporta sull'elenco l'esito di ciascun chatbot, e spegne il flag locale `modified`
   * del chatbot aperto solo se e' stato pubblicato davvero.
   */
  private applyResults(results: any[]): void {
    if (!Array.isArray(results)) { return; }
    for (const result of results) {
      const target = this.publishTargets.find(t => t._id === result?.id);
      if (!target) { continue; }
      target.outcome = result?.success ? 'success' : 'error';
      target.error = result?.success ? undefined : (result?.error || '');
      if (result?.success) {
        target.modified = false;
        // Tolto dalla selezione: se qualcun altro e' fallito il pannello resta aperto,
        // e un secondo tentativo deve riguardare solo chi non e' passato.
        target.selected = false;
      }
    }
    const current = this.publishTargets.find(t => t._id === this.selectedChatbot?._id);
    if (current?.outcome === 'success' && this.dashboardService.selectedChatbot) {
      this.dashboardService.selectedChatbot.modified = false;
    }
  }

  /** Il vecchio percorso a chatbot singolo, tenuto per il ripristino di una release. */

  presentInstallModal() {
    this.selectedChatbot = this.dashboardService.selectedChatbot;
    this.projectID = this.dashboardService.projectID;

    const dialogRef = this.dialog.open(CdsModalActivateBotComponent, {
      data: {
        chatbot: this.dashboardService.selectedChatbot,
        departments: this.dashboardService.departments,
        project_id: this.dashboardService.projectID
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      this.logger.log(`[PUBLISH-PANEL] Dialog result: ${result}`);
      // this.segmentChatbotPublished()
    });

  }


  onChangeCheckbox(event: MatCheckboxChange) {
    this.logger.log('[PUBLISH-PANEL] onChangeCheckbox event ', event)
    this.appStorageService.setItem(`hide-install-button-${this.projectID}`, event.checked);
  }


  // animateSvg() {
  //   setTimeout(() => {
  //     this.showRocket = false; // Remove the rocket after the animation
  //     this.showCheckMark = true; // Show the checkmark
  //   }, 4000); // Adjust the timing to match the animation duration
  // }



  // onBlur(event) {
  //   this.updateAndSaveAction.emit();
  // }

}
