import { animate, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
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
import { DepartmentService } from 'src/app/services/department.service';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { NotifyService } from 'src/app/services/notify.service';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

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

export class CdsPanelPublishComponent implements OnInit {
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
  ) {

  }

  ngOnInit(): void {
    // this.checkDepartmentsForProjectIdHasBot();
    this.serverBaseURL = this.appConfigService.getConfig().apiUrl;

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
    this.PUBLISH_PENDING = true
    this.status = 'pending';
    // const startTime = Date.now();
    // this.isRocketShaking = true; // Optional: rocket shakes while waiting
    // this.presentInstallModal()

    this.faqKbService.publish(this.selectedChatbot, null, this.releaseNote).subscribe({
      next: (data) => {
        this.logger.log('[CDS DSBRD] publish  - RES ', data)
        if (data) {
          this.status = 'success';
        }
        // const elapsed = (Date.now() - startTime) / 1000;
        // this.animationDuration = elapsed + 1; // Progress + 1s buffer
        // this.rocketExitDelay = this.animationDuration;
        // this.showResultDelay = this.rocketExitDelay + 1;

        // Delay setting 'success' until rocket & stars are done
        // setTimeout(() => {
        //   this.status = 'success';
        //   //  this.status = 'error'
        //   this.isRocketShaking = false; // Optional: stop rocket shaking
        // }, this.showResultDelay * 1000); // Delay in milliseconds


      }, error: (error) => {
        this.status = 'error';
        // const elapsed = (Date.now() - startTime) / 1000;
        // this.animationDuration = elapsed + 1;
        // this.rocketExitDelay = this.animationDuration;
        // this.showResultDelay = this.rocketExitDelay + 1;

        // setTimeout(() => {
        //   this.status = 'error';
        //   this.isRocketShaking = false;
        // }, this.showResultDelay * 1000);


        this.PUBLISH_PENDING = true
        this.HAS_COMPLETED_PUBLISH = true
        this.HAS_COMPLETED_PUBLISH_ERROR = true
        this.logger.error('[CDS DSBRD] publish ERROR ', error);
      }, complete: () => {
        this.HAS_COMPLETED_PUBLISH = true
        this.HAS_COMPLETED_PUBLISH_SUCCESS = true
        this.logger.log('[CDS DSBRD] publish * COMPLETE *');
        // this.animateSvg()
      }
    });
  }


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
