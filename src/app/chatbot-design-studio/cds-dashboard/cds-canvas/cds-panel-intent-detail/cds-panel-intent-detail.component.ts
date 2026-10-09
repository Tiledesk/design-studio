import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges, ViewChild, AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslateService } from '@ngx-translate/core';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { WebhookService } from 'src/app/chatbot-design-studio/services/webhook-service.service';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { ConnectorService } from 'src/app/chatbot-design-studio/services/connector.service';
import { RESERVED_INTENT_NAMES, STAGE_SETTINGS } from 'src/app/chatbot-design-studio/utils';
import { TYPE_CHATBOT, TYPE_ACTION, resolveChatbotSubtype, isReturnStackIntent } from 'src/app/chatbot-design-studio/utils-actions';
import { Intent } from 'src/app/models/intent-model';
import { Project } from 'src/app/models/project-model';
import { AppConfigService } from 'src/app/services/app-config';
import { DashboardService } from 'src/app/services/dashboard.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { PanelIntentHeaderComponent } from '../cds-intent/panel-intent-header/panel-intent-header.component';
import { startPointTypeOf, startPointPanelState, supportsStartPoints } from 'src/app/chatbot-design-studio/utils-start-points';
import { PayloadRow, Weekday, WEEKDAYS } from 'src/app/chatbot-design-studio/utils-schedule';
import { ScheduledPanelModel, ScheduledRepeat, ScheduledStatusLine, scheduledStatusLine, timezoneList, browserTimezone, MINUTE_STEPS, HOUR_STEPS, DAYS_OF_MONTH, scheduledLoadOutcome, scheduledLoadedOutcome } from 'src/app/chatbot-design-studio/utils-scheduled-panel';
import { StartPointManagerService, startPointFailure } from 'src/app/chatbot-design-studio/services/start-point-manager.service';
import { ControllerService } from 'src/app/chatbot-design-studio/services/controller.service';
import { ReadOnlyService } from 'src/app/services/read-only.service';

const swal = require('sweetalert');

@Component({
  selector: 'cds-panel-intent-detail',
  templateUrl: './cds-panel-intent-detail.component.html',
  styleUrls: ['./cds-panel-intent-detail.component.scss']
})
export class CdsPanelIntentDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('tooltip') tooltip: MatTooltip;
  @ViewChild(PanelIntentHeaderComponent) panelIntentHeader: PanelIntentHeaderComponent;
  @Input() intent: Intent;
  @Output() savePanelIntentDetail = new EventEmitter();
  @Output() closePanel = new EventEmitter();
  @Output() updateAndSaveAction = new EventEmitter();
  
  maximize: boolean = true;

  isStart: boolean = false;
  isWebhook: boolean = false;
  /** nodo terminale "Return to parent agent": non deve avere connettore in uscita */
  isReturnStack: boolean = false;
  /** panel of the marker block "Webhook start" */
  isStartPoint: boolean = false;
  webhook: any = null;
  spEnabled: boolean = false;
  spSourceName: string = '';
  defaultSourceName: string = '';
  spBusy: boolean = false;

  /** panel of the marker block "Scheduled start" */
  isScheduledStart: boolean = false;
  scheduled: ScheduledPanelModel;
  scheduledStatusLine: ScheduledStatusLine | null = null;
  /** the server has no scheduler configured (GET scheduled_available false): the message replaces the form, Delete stays */
  scheduledUnavailable: string = '';
  timezones: { name: string, value: string }[] = [];
  readonly weekdays: Weekday[] = WEEKDAYS;
  readonly minuteSteps = MINUTE_STEPS;
  readonly hourSteps = HOUR_STEPS;
  readonly daysOfMonth = DAYS_OF_MONTH;
  private webhookSubscription: Subscription;
  /** settings changed outside the panel (agent chat start_point tool): reload */
  private settingsSubscription: Subscription;
  private unregisterPanel: () => void;

  // Connector management
  listOfIntents: Array<{name: string, value: string, icon?:string}> = [];
  selectedNextIntent: string | null = null;

  /* webhook params */
  serverBaseURL: string;
  project: Project;
  project_id: string;
  chatbot_id: string;
  webhookUrl: string;
  webhookUrlDev: string;
  messageText: string = '';
  action: any = {};
  chatbotSubtype: string;

  private readonly logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private readonly webhookService: WebhookService,
    private readonly appConfigService: AppConfigService,
    private readonly dashboardService: DashboardService,
    private readonly translate: TranslateService,
    private readonly stageService: StageService,
    private readonly intentService: IntentService,
    private readonly connectorService: ConnectorService,
    private readonly controllerService: ControllerService,
    private readonly readOnlyService: ReadOnlyService,
    private readonly startPointManager: StartPointManagerService
  ) {
  }

  ngOnInit(): void {
    this.maximize = this.stageService.getMaximize();
    if(this.intent.intent_display_name === RESERVED_INTENT_NAMES.START) {
      this.initializeStart();
    } else if(startPointTypeOf(this.intent) === 'webhook') {
      this.initializeStartPoint();
    } else if(startPointTypeOf(this.intent) === 'scheduled') {
      this.initializeScheduledStart();
    } else if(this.intent.intent_display_name === RESERVED_INTENT_NAMES.WEBHOOK) {
      this.initializeWebhook();
    }

    this.isReturnStack = isReturnStackIntent(this.intent);

    // Inizializza la lista degli intent per la select del connettore
    if (!this.isStart && !this.isWebhook && !this.isReturnStack && !this.isStartPoint && !this.isScheduledStart) {
      this.initializeConnectorSelect();
    }
  }

  ngOnDestroy(): void {
    // an edit still waiting for its debounce is saved, not lost
    this.scheduled?.flush();
    this.webhookSubscription?.unsubscribe();
    this.settingsSubscription?.unsubscribe();
    this.unregisterPanel?.();
  }

  ngAfterViewInit(): void {
    // Metti il focus sull'input del nome intent quando il pannello si apre
    if (this.panelIntentHeader) {
      this.panelIntentHeader.focusInput();
    }
  }
    

  ngOnChanges(changes: SimpleChanges): void {
    this.logger.log('[CdsPanelIntentDetailComponent] changes: ', changes)
    // Se l'intent cambia, rimetti il focus sull'input
    // if (changes['intent'] && !changes['intent'].firstChange && this.panelIntentHeader) {
    //   setTimeout(() => {
    //     this.panelIntentHeader.focusInput();
    //   }, 0);
    // }
  }



  initializeStart(){
    this.isStart = true;
    if(this.intent.agents_available !== false) this.intent.agents_available = true;
  }

  /** Sola lettura: il pannello del box di partenza mostra lo stato ma non lo cambia */
  get readOnly(): boolean {
    return this.readOnlyService.readOnly;
  }

  initializeStartPoint(){
    this.isStartPoint = true;
    this.maximize = true;
    this.serverBaseURL = this.appConfigService.getConfig().apiUrl;
    this.chatbot_id = this.dashboardService.id_faq_kb;
    // an empty source name falls back to the chatbot name on the server
    this.defaultSourceName = this.dashboardService.selectedChatbot?.name || '';
    this.getWebhook();
    this.settingsSubscription = this.startPointManager.settingsChanged$.subscribe(change => {
      if (change.type === 'webhook') {
        this.getWebhook();
      }
    });
  }

  private applyStartPointState(){
    const state = startPointPanelState(this.webhook, this.intent, this.serverBaseURL);
    this.spEnabled = state.enabled;
    this.spSourceName = state.sourceName;
    this.webhookUrl = state.url;
    this.webhookUrlDev = state.devUrl;
  }

  /** switch on/off: the block stays, only the start point is enabled or disabled */
  onStartPointEnabledChange(enabled: boolean){
    if (this.readOnly) {
      this.applyStartPointState();
      return;
    }
    this.spEnabled = enabled;
    this.upsertStartPoint({ block_id: this.intent.intent_id, enabled });
  }

  onStartPointSourceNameChange(){
    if (this.readOnly) {
      this.applyStartPointState();
      return;
    }
    const source_name = (this.spSourceName || '').trim();
    this.upsertStartPoint({ block_id: this.intent.intent_id, mapping: { source_name } });
  }

  private upsertStartPoint(body: any){
    this.startPointManager.put('webhook', body).subscribe({ next: (resp: any) => {
      this.stopWebhookStartTest();
      // the webhook is the source of truth for the panel
      this.getWebhook();
    }, error: (error) => {
      this.logger.error("[CdsPanelIntentDetailComponent] error upsertStartPoint: ", error);
      this.applyStartPointState();
      this.showMessage(this.translate.instant('CDSCanvas.StartWebhookError'));
    }});
  }

  /**
   * Web start can be disabled only on subtype chatbot (start points); on any other subtype (voice, subagent, ...)
   * the start block is the flow's only entry and there would be no way to bring it back.
   */
  get canDeleteWebStart(): boolean {
    return supportsStartPoints(this.dashboardService?.selectedChatbot?.subtype);
  }

  /** Web start panel: Delete goes through the service like the other start boxes (it hides the box, never deletes the block) */
  onDeleteWebStart(){
    if (this.readOnly || !this.canDeleteWebStart) {
      return;
    }
    this.confirmAndDeleteStartPoint('web');
  }

  onDeleteStartPoint(){
    if (this.readOnly) {
      return;
    }
    this.confirmAndDeleteStartPoint('webhook', 'CDSCanvas.StartWebhookDeleteTitle', 'CDSCanvas.StartWebhookDeleteText');
  }

  /**
   * Delete flow of a start box, run by the start point service: confirmation, then the server start point, then
   * the box (a failure keeps the box and shows the error). The dialog keys are the service's own for each type.
   */
  private async confirmAndDeleteStartPoint(type: 'web' | 'webhook' | 'scheduled', _titleKey?: string, _textKey?: string){
    if (this.spBusy) {
      return;
    }
    this.spBusy = true;
    try {
      const result = await this.startPointManager.remove(type);
      const failure = startPointFailure(result);
      // nothing to say when the user cancelled or the box is already being removed; any other failure keeps the box: say why
      if (failure && failure.code !== 'declined' && !failure.in_progress) {
        this.showMessage(type === 'webhook' ? this.translate.instant('CDSCanvas.StartWebhookError') : failure.error);
      }
    } finally {
      this.spBusy = false;
    }
  }

  private startPointErrorMessage(error: any, type: 'webhook' | 'scheduled'): string {
    if (type === 'scheduled') {
      return error?.error?.error || this.translate.instant('CDSCanvas.ScheduledPanel.SaveError');
    }
    return this.translate.instant('CDSCanvas.StartWebhookError');
  }

  // ---------------------------------------------------------- scheduled box

  initializeScheduledStart(){
    this.isScheduledStart = true;
    this.maximize = true;
    this.chatbot_id = this.dashboardService.id_faq_kb;
    this.defaultSourceName = this.dashboardService.selectedChatbot?.name || '';
    const tz = browserTimezone();
    this.scheduled = new ScheduledPanelModel({
      upsert: (body) => this.startPointManager.put('scheduled', body),
      sync: () => this.webhookService.syncScheduledStart(this.chatbot_id),
      // the canvas box badge and this status line both follow webhook$
      refresh: () => this.webhookService.loadWebhook(this.chatbot_id, true),
      onError: (error) => {
        this.logger.error("[CdsPanelIntentDetailComponent] error scheduled start: ", error);
        this.showMessage(this.startPointErrorMessage(error, 'scheduled'));
      }
    }, this.intent.intent_id, tz);
    this.timezones = timezoneList(this.scheduled.schedule.timezone, tz);
    const scheduled = this.scheduled;
    this.unregisterPanel = this.startPointManager.registerPanel('scheduled', {
      cancelPending: () => scheduled.cancelPending(),
      whenIdle: () => scheduled.whenIdle(),
      suspend: () => scheduled.suspend(),
      resume: (resave) => scheduled.resume(resave)
    });
    this.loadScheduled(tz);
    this.settingsSubscription = this.startPointManager.settingsChanged$.subscribe(change => {
      if (change.type === 'scheduled') {
        // changed by the agent chat: the form shows the saved draft; saves start again only once it is loaded
        // (an edit typed meanwhile is dropped: saving it would revert the change)
        this.loadScheduled(tz, () => scheduled.resume(false));
      }
    });
  }

  /** The form and status line from a fresh GET of the webhook; `done` runs once it is answered (loaded or not) */
  private loadScheduled(tz: string, done: () => void = () => {}){
    // the status line follows webhook$ only (this fresh GET is published there too, and an older answer never overwrites it);
    // later updates (after a save, a sync, a publish) only refresh the status: the form is the user's draft
    const followWebhook = () => {
      this.webhookSubscription?.unsubscribe();
      this.webhookSubscription = this.webhookService.webhook$.subscribe(webhook => {
        if (webhook) {
          this.webhook = webhook;
          this.scheduledStatusLine = scheduledStatusLine(webhook);
        }
      });
    };
    this.webhookService.fetchWebhook(this.chatbot_id).pipe(finalize(done)).subscribe({ next: (resp: any) => {
      const loaded = scheduledLoadedOutcome(resp);
      if (loaded.state === 'unavailable') {
        this.scheduledUnavailable = loaded.message;
        return;
      }
      this.webhook = resp;
      this.scheduled.load(resp, tz);
      this.timezones = timezoneList(this.scheduled.schedule.timezone, tz);
      this.scheduledStatusLine = scheduledStatusLine(resp);
      followWebhook();
    }, error: (error) => {
      const outcome = scheduledLoadOutcome(error);
      if (outcome.state === 'unavailable') {
        this.scheduledUnavailable = outcome.message;
        return;
      }
      if (outcome.state === 'no_webhook') {
        // no webhook yet (imported, forked or redone box): the defaults, switched off
        this.scheduled.load(null, tz);
        this.scheduledStatusLine = scheduledStatusLine(null);
        followWebhook();
        return;
      }
      this.logger.error("[CdsPanelIntentDetailComponent] error getWebhook: ", error);
      this.showMessage(this.translate.instant('CDSCanvas.StartWebhookLoadError'));
    }});
  }

  get scheduledPayloadHintParams() {
    // literal {{check}} / {{start_type}} in the copy: pass them as values so the translate interpolation keeps them
    return { check: '{{check}}', start_type: '{{start_type}}' };
  }

  // Sola lettura: il pannello Scheduled mostra la bozza ma non la cambia; i controlli sono disabilitati
  // e questi handler non toccano il modello (nessun salvataggio, sync, test o cancellazione parte)

  /** the switch: in read-only the checkbox is put back to the model state */
  onScheduledEnabledChange(input: { checked: boolean }){
    if (this.readOnly) {
      if (input) { input.checked = this.scheduled.enabled; }
      return;
    }
    this.scheduled.setEnabled(input.checked);
  }

  onScheduledRepeatChange(value: ScheduledRepeat){
    if (this.readOnly) { return; }
    this.scheduled.setRepeat(value);
  }

  onScheduledEveryChange(value: any){
    if (this.readOnly) { return; }
    this.scheduled.setEvery(value);
  }

  onScheduledTimeChange(value: string){
    if (this.readOnly) { return; }
    this.scheduled.setTime(value);
  }

  onScheduledWeekdayToggle(day: Weekday){
    if (this.readOnly) { return; }
    this.scheduled.toggleWeekday(day);
  }

  onScheduledDayOfMonthChange(value: any){
    if (this.readOnly) { return; }
    this.scheduled.setDayOfMonth(value);
  }

  onScheduledTimezoneChange(value: string){
    if (this.readOnly) { return; }
    this.scheduled.setTimezone(value);
  }

  onScheduledSourceNameChange(value: string){
    if (this.readOnly) { return; }
    this.scheduled.setSourceName(value);
  }

  onScheduledAddRow(){
    if (this.readOnly) { return; }
    this.scheduled.addRow();
  }

  onScheduledRemoveRow(index: number){
    if (this.readOnly) { return; }
    this.scheduled.removeRow(index);
  }

  onScheduledRowNameChange(row: PayloadRow, value: string){
    if (this.readOnly) { return; }
    row.name = value;
    this.scheduled.rowsEdited();
  }

  onScheduledRowValueChange(row: PayloadRow, value: any){
    if (this.readOnly) { return; }
    row.value = value;
    this.scheduled.rowsEdited();
  }

  onScheduledRowTypeChange(index: number, type: PayloadRow['type']){
    if (this.readOnly) { return; }
    this.scheduled.setRowType(index, type);
  }

  trackByIndex(index: number){
    return index;
  }

  onRetryScheduledSync(){
    if (this.readOnly) { return; }
    this.scheduled.retrySync();
  }

  onRetryScheduledSave(){
    if (this.readOnly) { return; }
    this.scheduled.retrySave();
  }

  async onTestScheduledStart(){
    if (this.readOnly || this.scheduled.hasError) {
      return;
    }
    // the draft the user sees: wait for a pending save
    const saved = await this.scheduled.flushAndWait();
    if (!saved) {
      // the server draft is stale: never test it
      this.showMessage(this.translate.instant('CDSCanvas.ScheduledPanel.SaveError'));
      return;
    }
    this.controllerService.requestWebhookStartTest('scheduled');
  }

  onDeleteScheduledStart(){
    if (this.readOnly) {
      return;
    }
    this.confirmAndDeleteStartPoint('scheduled', 'CDSCanvas.ScheduledPanel.DeleteTitle', 'CDSCanvas.ScheduledPanel.DeleteText');
  }

  initializeWebhook(){
    this.project_id = this.dashboardService.projectID;
    this.maximize = true;
    this.webhookUrl = '';
    this.webhookUrlDev = '';
    this.isWebhook = true;
    this.serverBaseURL = this.appConfigService.getConfig().apiUrl;
    this.chatbot_id = this.dashboardService.id_faq_kb;
    this.chatbotSubtype = resolveChatbotSubtype(this.dashboardService.selectedChatbot.subtype);
    this.getWebhook();
  }


  onAgentsAvailableChange(event: any){
    this.logger.log('[CdsPanelIntentDetailComponent] onAgentsAvailableChange:: ', event);
    this.intent.agents_available = event;
    this.onSaveIntent();
  }

  onSaveIntent(){
    this.logger.log('[CdsPanelIntentDetailComponent] onSaveIntent:: ', this.intent);
    this.savePanelIntentDetail.emit(this.intent);
  }

  getWebhook(){
    this.webhookService.getWebhook(this.chatbot_id).subscribe({ next: (resp: any)=> {
      this.logger.log("[CdsPanelIntentDetailComponent] getWebhook : ", resp);
      this.webhook = resp;
      if (this.isStartPoint) {
        this.applyStartPointState();
        return;
      }
      this.webhookUrl = this.serverBaseURL+'webhook/'+resp.webhook_id;
      this.webhookUrlDev = this.webhookUrl+"/dev";
    }, error: (error)=> {
      if (this.isStartPoint && error?.status === 404) {
        // no webhook yet (imported, forked or redone box): the switch is off and turning it on registers this box
        this.webhook = null;
        this.applyStartPointState();
        return;
      }
      this.logger.error("[CdsPanelIntentDetailComponent] error getWebhook: ", error);
      if (this.isStartPoint) {
        this.showMessage(this.translate.instant('CDSCanvas.StartWebhookLoadError'));
      }
      // // this.createWebhook();
    }, complete: () => {
      this.logger.log("[CdsPanelIntentDetailComponent] getWebhook completed.");
    }});
  }

  
  newWebhook(){
    this.logger.log("[CdsPanelIntentDetailComponent] newWebhook.", this.project);
    if(this.webhookUrl && this.webhookUrl.trim() !== ''){
      this.regenerateWebhook();
    } else {
      this.createWebhook();
    }
  }

  createWebhook(){
    const copilot = this.chatbotSubtype === TYPE_CHATBOT.COPILOT;
    this.webhookService.createWebhook(this.chatbot_id, this.intent.intent_id, true, copilot).subscribe({ next: (resp: any)=> {
      this.logger.log("[CdsPanelIntentDetailComponent] createWebhook : ", resp);
      this.webhookUrl = this.serverBaseURL+'webhook/'+resp.webhook_id;
      this.webhookUrlDev = this.webhookUrl+"/dev";
    }, error: (error)=> {
      this.logger.error("[CdsPanelIntentDetailComponent] error createWebhook: ", error);
    }, complete: () => {
      this.logger.log("[CdsPanelIntentDetailComponent] createWebhook completed.");
    }});
  }


  /** A running "Test webhook start" is bound to the current webhook id and preload: end it when that webhook changes */
  private stopWebhookStartTest(){
    if (this.intentService.webhookStartTest) {
      this.controllerService.stopTestItOut();
    }
  }

  onTestStartWebhook(){
    this.controllerService.requestWebhookStartTest();
  }

  onRegenerateWebhook(){
    if (this.isStartPoint && this.readOnly) {
      return;
    }
    swal({
      title: "Are you sure",
      text: 'if you regenerate the webhook url, the previous url will no longer be available',
      icon: "warning",
      buttons: ["Cancel", 'Regenerate'],
      dangerMode: false,
    })
    .then((resp: boolean) => {
      if (resp) {
        this.logger.log('[CDS DSBRD] Regenerate swal: ', resp);
        this.regenerateWebhook();
      } else {
        this.logger.log('[CDS DSBRD] Regenerate swal: ', resp);
      }
    });
  }

  regenerateWebhook(){
    this.webhookService.regenerateWebhook(this.chatbot_id).subscribe({ next: (resp: any)=> {
      this.logger.log("[CdsPanelIntentDetailComponent] regenerateWebhook : ", resp);
      this.stopWebhookStartTest();
      if (this.webhook) {
        this.webhook = { ...this.webhook, webhook_id: resp.webhook_id };
      }
      this.webhookUrl = this.serverBaseURL+'webhook/'+resp.webhook_id;
      this.webhookUrlDev = this.webhookUrl+"/dev";
    }, error: (error)=> {
      this.showMessage('error regenerating webhook '+JSON.stringify(error));
      this.logger.error("[CdsPanelIntentDetailComponent] error regenerateWebhook: ", error);
    }, complete: () => {
      this.logger.log("[CdsPanelIntentDetailComponent] regenerateWebhook completed.");
      this.showMessage('Webhook successfully regenerated!');
    }});
  }


  updateCopilotWebhook(copilot){
    this.logger.log("[CdsPanelIntentDetailComponent] updateCopilotWebhook : ", copilot);
    this.webhookService.updateCopilotWebhook(this.chatbot_id, copilot).subscribe({ next: (resp: any)=> {
      this.logger.log("[CdsPanelIntentDetailComponent] updateCopilotWebhook : ", resp);
      this.updateAndSaveAction.emit();
    }, error: (error)=> {
      this.logger.error("[CdsPanelIntentDetailComponent] error updateCopilotWebhook: ", error);
    }, complete: () => {
      this.logger.log("[CdsPanelIntentDetailComponent] updateCopilotWebhook completed.");
    }});
  }



  async copyText(dev): Promise<void> {
    let url = this.webhookUrl;
    if(dev === true){
      url = this.webhookUrl +'/dev';
    }
    if (navigator?.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        this.logger.log('Text copied successfully!');
        let translatedString = this.translate.instant('CDSCanvas.DevUrlCopied');
        this.showMessage(translatedString);
        
      } catch (err) {
        this.logger.error('Error copying text:', err);
        let translatedString = this.translate.instant('CDSCanvas.TextErrorCopied');
        this.showMessage(translatedString+': ' +JSON.stringify(err));
      }
    } else {
      this.logger.log('Clipboard API not supported by your browser.');
      let translatedString = this.translate.instant('CDSCanvas.ApiNotSupported');
      this.showMessage(translatedString);
    }
  }

  private showMessage(msg: string): void {
    this.messageText = msg;
    setTimeout(() => {
      this.messageText = '';
    }, 5000);
  }
  
    onChangeMaximize(){
      this.maximize = !this.maximize;
      const id_faq_kb = this.dashboardService.id_faq_kb;
      this.stageService.saveSettings(id_faq_kb, STAGE_SETTINGS.Maximize, this.maximize);
    }
  
    onCopyToClipboard(value: string): void {
      navigator.clipboard.writeText(value).then(() => {
        this.tooltip.disabled = false;
        this.tooltip.show();
        setTimeout(() => {
          this.tooltip.hide();
          this.tooltip.disabled = true;
        }, 1000);
      });
    }

    goToKNB(){
      let url = this.appConfigService.getConfig().dashboardBaseUrl + '#/project/' + this.project_id +'/integrations?name='
      window.open(url, '_blank');
    }

  /**
   * Inizializza la select per gestire il connettore dell'intent.
   * Carica la lista degli intent escludendo quello corrente.
   */
  private initializeConnectorSelect(): void {
    // Ottiene la lista di tutti gli intent
    this.listOfIntents = this.intentService.getListOfIntents();
    
    // Filtra escludendo l'intent corrente e gli intent riservati START/WEBHOOK
    this.listOfIntents = this.listOfIntents.filter(intent => {
      const intentId = intent.value.replace('#', '');
      return intentId !== this.intent.intent_id &&
             intent.name !== RESERVED_INTENT_NAMES.START &&
             intent.name !== RESERVED_INTENT_NAMES.WEBHOOK;
    });
    
    // Ordina alfabeticamente
    this.listOfIntents.sort((a, b) => a.name.localeCompare(b.name));
    
    // Imposta il valore selezionato se esiste già un connettore
    if (this.intent.attributes?.nextBlockAction?.intentName) {
      this.selectedNextIntent = this.intent.attributes.nextBlockAction.intentName;
    }
  }

  /**
   * Gestisce la selezione di un intent per il connettore.
   */
  onChangeNextIntentSelect(event: {name: string, value: string}): void {
    if (!event || !event.value) {
      return;
    }

    this.logger.log('[CdsPanelIntentDetailComponent] onChangeNextIntentSelect:', event);
    
    // Assicura che esista nextBlockAction
    if (!this.intent.attributes) {
      this.intent.attributes = {};
    }
    
    if (!this.intent.attributes.nextBlockAction) {
      // Crea una nuova azione INTENT se non esiste
      this.intent.attributes.nextBlockAction = this.intentService.createNewAction(TYPE_ACTION.INTENT);
    }
    
    // Aggiorna il valore
    this.intent.attributes.nextBlockAction.intentName = event.value;
    this.selectedNextIntent = event.value;
    
    // Crea o aggiorna il connettore
    const fromId = `${this.intent.intent_id}/${this.intent.attributes.nextBlockAction._tdActionId}`;
    const toId = event.value.replace('#', '');
    
    if (this.stageService.loaded) {
      this.connectorService.createConnectorFromId(fromId, toId, true);
    }
    
    // Salva l'intent
    this.onSaveIntent();
  }

  /**
   * Gestisce il reset della select del connettore.
   */
  onResetNextIntentSelect(event: {name: string, value: string}): void {
    this.logger.log('[CdsPanelIntentDetailComponent] onResetNextIntentSelect');
    
    if (this.intent.attributes?.nextBlockAction) {
      const fromId = `${this.intent.intent_id}/${this.intent.attributes.nextBlockAction._tdActionId}`;
      const toId = this.intent.attributes.nextBlockAction.intentName?.replace('#', '');
      
      if (toId) {
        const connectorId = `${fromId}/${toId}`;
        this.connectorService.deleteConnector(this.intent, connectorId);
      }
      
      // Rimuovi il riferimento al connettore
      this.intent.attributes.nextBlockAction.intentName = null;
      this.selectedNextIntent = null;
      
      // Salva l'intent
      this.onSaveIntent();
    }
  }
}
