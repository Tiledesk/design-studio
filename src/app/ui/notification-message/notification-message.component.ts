import { Component, ViewEncapsulation, OnInit, OnDestroy, isDevMode } from '@angular/core';

import { NotifyService } from 'src/app/services/notify.service';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject, Subscription } from 'rxjs';
import { BrandService } from '../../services/brand.service';
import { takeUntil } from 'rxjs/operators';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { AppConfigService } from 'src/app/services/app-config';
import { ProjectService } from 'src/app/services/projects.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { Project } from 'src/app/models/project-model';
import { UserModel } from 'src/chat21-core/models/user';
import { ProjectUser } from 'src/app/models/project-user';
import { PLAN_NAME } from 'src/chat21-core/utils/constants';
import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';
const swal = require('sweetalert');
@Component({
  selector: 'notification-message',
  templateUrl: './notification-message.component.html',
  styleUrls: ['./notification-message.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class NotificationMessageComponent implements OnInit, OnDestroy {
  PLAN_NAME = PLAN_NAME
  private unsubscribe$: Subject<any> = new Subject<any>();
  tparams: any;
  brand_name: string;
  displayExpiredSessionModal: string;

  project: Project;
  user: UserModel

  gettingStartedChecklist: any;
  CHAT_BASE_URL: string;
  showSpinnerInModal = true;
  browserLang: string;
  subscriptionCanceledSuccessfully: string;
  subscriptionCanceledError: string;
  prjct_name: string;
  prjct_profile_type: string;
  subscription_is_active: boolean;
  trial_expired: boolean;
  subscription_end_date: any;
  prjct_profile_name: string;
  subscription: Subscription;
  WIDGET_URL: string;
  has_copied = false;
  tprojectprofilemane: any;
  USER_ROLE: string;
  profile_name: string;
  onlyOwnerCanManageTheAccountPlanMsg: string;
  learnMoreAboutDefaultRoles: string;
  contactUsEmail: string;
  IS_AVAILABLE: boolean;
  profile_name_for_segment: string;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    public notify: NotifyService,
    public projectService: ProjectService,
    private router: Router,
    private translate: TranslateService,
    public appConfigService: AppConfigService,
    private dashBoardService: DashboardService,
    public brandService: BrandService,
    private tiledeskAuthService: TiledeskAuthService
  ) {
    const brand = brandService.getBrand();
    this.tparams = brand;

    if (brand) {
      this.brand_name = brand['BRAND_NAME'];
      this.contactUsEmail = brand['CONTACT_US_EMAIL'];
    }

  }

  ngOnInit() {
    this.getBrowserLang();
    this.user = this.tiledeskAuthService.getCurrentUser()
    this.project = this.dashBoardService.project
    
    this.getUserAvailabilityAndRole()
    this.getProjectPlan();
    this.getWidgetUrl();
    this.getChatUrl();
    this.translateModalOnlyOwnerCanManageProjectAccount();
  }

  getUserAvailabilityAndRole() {
    this.projectService.getProjectUserByUserId(this.project._id, this.user.uid).pipe( takeUntil(this.unsubscribe$)).subscribe((projectUser: ProjectUser) => {
      //  console.log('[CDS-SIDEBAR] - SUBSCRIPTION TO USER ROLE »»» ', userRole)
      if (projectUser.role !== undefined) {
        this.USER_ROLE = projectUser.role;
      }
      if(projectUser.user_available !== undefined) {
        this.IS_AVAILABLE = projectUser.user_available;
      }
    })
  }


  translateModalOnlyOwnerCanManageProjectAccount() {
    this.translate.get('OnlyUsersWithTheOwnerRoleCanManageTheAccountPlan').subscribe((translation: any) => {
        this.onlyOwnerCanManageTheAccountPlanMsg = translation;
      });

    this.translate.get('LearnMoreAboutDefaultRoles').subscribe((translation: any) => {
        this.learnMoreAboutDefaultRoles = translation;
      });
  }

  getChatUrl() {
    this.CHAT_BASE_URL = this.appConfigService.getConfig().CHAT_BASE_URL;
  }

  getWidgetUrl() {
    this.WIDGET_URL = this.appConfigService.getConfig().widgetUrl;
  }

  getProjectPlan() {
    this.prjct_name = this.project.name
    this.prjct_profile_type = this.project.profile.type
    this.subscription_is_active = this.project.isActiveSubscription
    this.trial_expired = this.project.trialExpired
    this.subscription_end_date = this.project.profile.subEnd
    this.tprojectprofilemane = { projectprofile: this.project.profile.name.toUpperCase() }
    this.profile_name = this.project.profile.name;
    this.buildPlanName(this.project.profile.name, this.browserLang, this.prjct_profile_type);

    if (this.project.profile.type === 'free') {
      if (this.project.trialExpired === false) {
        this.profile_name_for_segment = PLAN_NAME.B + " (trial)"
      } else {
        this.profile_name_for_segment = "Free"
      }
    } else if (this.project.profile.type === 'payment') {
      if (this.project.profile.name === PLAN_NAME.A) {
        this.profile_name_for_segment = PLAN_NAME.A
      } else if (this.project.profile.name === PLAN_NAME.B) {
        this.profile_name_for_segment = PLAN_NAME.B
      } else if (this.project.profile.name === PLAN_NAME.C) {
        this.profile_name_for_segment = PLAN_NAME.C
      }
    }

  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  buildPlanName(planName: string, browserLang: string, planType: string) {
    this.logger.log('[NOTIFICATION-MSG] buildPlanName - planName ', planName, ' browserLang  ', browserLang);

    if (planType === 'payment') {

      if (planName === PLAN_NAME.A) {
        this.prjct_profile_name = PLAN_NAME.A + 'plan'
        this.profile_name_for_segment = PLAN_NAME.A
      } else if (this.prjct_profile_name === PLAN_NAME.B) {
        this.prjct_profile_name = PLAN_NAME.B + 'plan'
        this.profile_name_for_segment = PLAN_NAME.B
      } else if (this.prjct_profile_name === PLAN_NAME.C) {
        this.prjct_profile_name = PLAN_NAME.C + 'plan'
        this.profile_name_for_segment = PLAN_NAME.C
      }



      // this.getPaidPlanTranslation(planName)
      // if (browserLang === 'it') {
      //   this.prjct_profile_name = 'Piano ' + planName;
      //   return this.prjct_profile_name
      // } else if (browserLang !== 'it') {
      //   this.prjct_profile_name = planName + ' Plan';
      //   return this.prjct_profile_name
      // }
    }
  }

  // getPaidPlanTranslation(project_profile_name) {
  //   this.translate.get('PaydPlanName', { projectprofile: project_profile_name })
  //     .subscribe((text: string) => {
  //       this.prjct_profile_name = text;

  //       // this.logger.log('+ + + PaydPlanName ', text)
  //     });
  // }


  openModalExpiredSubscOrGoToPricing() {

    if (this.USER_ROLE === 'owner') {
      if (this.prjct_profile_type === 'free' && this.trial_expired === true) {
        this.notify.closeDataExportNotAvailable();
        this.router.navigate(['project/' + this.project._id + '/pricing']);
        // this.notify.presentContactUsModalToUpgradePlan(true);

      } else if (this.prjct_profile_type === 'payment' && this.subscription_is_active === false) {
        this.notify.closeDataExportNotAvailable();
        if (this.profile_name !== PLAN_NAME.C) {
          this.notify.displaySubscripionHasExpiredModal(true, this.prjct_profile_name, this.subscription_end_date);
        } else if (this.profile_name === PLAN_NAME.C) {

          this.notify.displayEnterprisePlanHasExpiredModal(true, this.prjct_profile_name, this.subscription_end_date);
        }
      }

    } else {
      this.notify.closeDataExportNotAvailable()
      this.notify.presentModalOnlyOwnerCanManageTheAccountPlan(this.onlyOwnerCanManageTheAccountPlanMsg, this.learnMoreAboutDefaultRoles);
    }
  }

  onLogoutModalHandled() {
    this.notify.closeLogoutModal()
    this.tiledeskAuthService.logOut();
  }

  getBrowserLang() {
    this.browserLang = this.translate.getBrowserLang();
  }

  onOkExpiredSessionModal() {
    this.notify.onOkExpiredSessionModal();
    this.tiledeskAuthService.logOut();
  }

  goToPricing() {
    this.logger.log('goToPricing projectId ', this.project._id);
    this.router.navigate(['project/' + this.project._id + '/pricing']);

    this.notify.closeModalSubsExpired();
    // this.notify.presentContactUsModalToUpgradePlan(true);
  }

  launchWidget() {
    // if (window && window['tiledesk']) {
    //   window['tiledesk'].open();
    // }
    window.open('mailto:' + this.contactUsEmail, 'mail')
  }


  // ----------------------------------------
  // TODO: PROBABLY NOT USED - VERIFY BETTER
  // ----------------------------------------
  copyToClipboard() {
    document.querySelector('textarea').select();
    document.execCommand('copy');

    this.has_copied = true;
    setTimeout(() => {
      this.has_copied = false;
    }, 2000);
  }

  // ----------------------------------------
  // TODO: PROBABLY NOT USED - VERIFY BETTER
  // ----------------------------------------
  openChat() {
    // localStorage.setItem('chatOpened', 'true');
    const url = this.CHAT_BASE_URL;
    window.open(url, '_blank');
    this.notify.publishHasClickedChat(true);
  }

  // ----------------------------------------
  // TODO: PROBABLY NOT USED - VERIFY BETTER
  // ----------------------------------------
  goToWidgetPage() {
    this.router.navigate(['project/' + this.project._id + '/widget']);
    this.notify.closeModalInstallTiledeskModal()
  }


  // --------------------------------------------------------------------------------------------
  // NOT USED - subdsribe to hasOpenChecklistModal and get project by is > project.gettingStarted
  // --------------------------------------------------------------------------------------------

  // getProjectById() {
  //   this.notify.hasOpenChecklistModal.subscribe((hasOpen: boolean) => {
  //     this.logger.log('[NOTIFICATION-MSG] - THE checklist modal has been opened ', hasOpen);

  //     if (hasOpen === true) {
  //       this.projectService.getProjectById(this.projectId)
  //         .subscribe((project: any) => {


  //           if (project) {
  //             this.logger.log('[NOTIFICATION-MSG] - GET PROJECT BY ID : ', project);

  //             if (project.gettingStarted) {
  //               this.gettingStartedChecklist = project.gettingStarted;
  //               this.logger.log('[NOTIFICATION-MSG] - GET PROJECT Getting Started Checklist : ', this.gettingStartedChecklist);
  //             }
  //           }
  //         }, (error) => {
  //           this.showSpinnerInModal = false;
  //           this.logger.error('[NOTIFICATION-MSG]  GET PROJECT BY ID - ERROR ', error);
  //         }, () => {
  //           this.showSpinnerInModal = false;
  //           this.logger.log('[NOTIFICATION-MSG]  GET PROJECT BY ID * COMPLETE *');
  //         });
  //     }
  //   })
  // }

  // -------------------------------------
  // CHECKLIST MODAL - NOT USED
  // -------------------------------------

  // hasClickedChecklist(event) {
  //   this.logger.log('[NOTIFICATION-MSG] - event : ', event);
  //   this.logger.log('[NOTIFICATION-MSG] - target name : ', event.target.name);

  //   if (event.target.name === 'openChat') {
  //     // this.openChat()
  //     this.notify.onCloseCheckLIstModal();

  //     this.updateGettingStarted('openChat');
  //   } else if (event.target.name === 'openWidget') {

  //     // this.router.navigate(['project/' + this.projectId + '/widget']);
  //     this.notify.onCloseCheckLIstModal();

  //     // const updatedGettingStarted = this.gettingStartedChecklist[1].done = true;

  //     this.updateGettingStarted('openWidget')


  //   } else if (event.target.name === 'openUserProfile') {

  //     // this.router.navigate(['project/' + this.projectId + '/user-profile']);

  //     this.notify.onCloseCheckLIstModal();
  //     // const updatedGettingStarted = this.gettingStartedChecklist[2].done = true;
  //     this.updateGettingStarted('openUserProfile')
  //   }
  // }

  // ----------------------------------------
  // CALLED BY hasClickedChecklist - NOT USED
  // ----------------------------------------

  // updateGettingStarted(selectesTask) {
  //   // const updatedGettingStarted = [
  //   //   { 'task': 'openChat', 'taskDesc': 'openChatDesc', 'done': false },
  //   //   { 'task': 'openWidget', 'taskDesc': 'openWidgetDesc', 'done': false },
  //   //   { 'task': 'openUserProfile', 'taskDesc': 'openUserProfileDesc', 'done': false }
  //   // ]


  //   const objIndex = this.gettingStartedChecklist.findIndex((obj => obj.task === selectesTask));
  //   // Log object to this.logger.
  //   this.logger.log('666 Before update: ', this.gettingStartedChecklist[objIndex])
  //   this.logger.log('666 updatedGettingStarted ', this.gettingStartedChecklist);
  //   // Update object's name property.
  //   this.gettingStartedChecklist[objIndex].done = true;

  //   // Log object to this.logger again.
  //   this.logger.log('[NOTIFICATION-MSG]  666 After update: ', this.gettingStartedChecklist[objIndex]),

  //     this.logger.log('[NOTIFICATION-MSG]  666 After update 2: ', this.gettingStartedChecklist)

  //   this.projectService.updateGettingStartedProject(this.gettingStartedChecklist)
  //     .subscribe((res) => {
  //       this.logger.log('[NOTIFICATION-MSG] - GETTING-STARTED UPDATED: ', res.gettingStarted);
  //     },
  //       (error) => {
  //         this.logger.error('[NOTIFICATION-MSG] - GETTING-STARTED UPDATED - ERROR ', error);
  //       },
  //       () => {
  //         this.logger.log('[NOTIFICATION-MSG] - GETTING-STARTED UPDATED * COMPLETE *');
  //       });
  // }


  // -----------------------------------------------------------------
  // DOWNGRADE PLAN TO FREE - DO I NEED TO DO SERVICE ON TILEDESK API?
  // ------------------------------------------------------------------

  // downgradePlanToFree() {
  //   //
  //   this.projectService.downgradePlanToFree(this.projectId)
  //     .subscribe((prjct) => {

  //       this.logger.log('[NOTIFICATION-MSG] -  downgradePlanToFree ', prjct);
  //     }, (error) => {
  //       this.logger.error('[NOTIFICATION-MSG] -  downgradePlanToFree ERROR ', error);
  //     },
  //       () => {
  //         this.logger.log('[NOTIFICATION-MSG] -  downgradePlanToFree * COMPLETE *');

  //         // CALL getProjectByID IN THE ProjectPlanService THAT PUBLISH THE UPDATED PROJECT
  //         this.prjctPlanService.getProjectByIdAndPublish(this.projectId);
  //         this.notify.closeModalSubsExpired();
  //       });
  // }


}
