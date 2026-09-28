import { Component, EventEmitter, Input, OnInit, Output, ElementRef, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// SERVICES //
import { DashboardService } from 'src/app/services/dashboard.service';

// UTILS //
import { SIDEBAR_PAGES } from '../../utils';
import { INFO_MENU_ITEMS } from '../../utils-menu';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ProjectService } from 'src/app/services/projects.service';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { UserModel } from 'src/chat21-core/models/user';
import { ProjectUser } from 'src/app/models/project-user';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'cds-sidebar',
  templateUrl: './cds-sidebar.component.html',
  styleUrls: ['./cds-sidebar.component.scss']
})
export class CdsSidebarComponent implements OnInit {

  @Input() IS_OPEN_SIDEBAR: boolean;
  // @Input() projectID: string;

  projectID: string;
  user: UserModel
  SIDEBAR_PAGES = SIDEBAR_PAGES;
  USER_ROLE: any;
  IS_OPEN: boolean = true;
  INFO_MENU_ITEMS = INFO_MENU_ITEMS;
  showRulesButton: boolean = false;
  
  private unsubscribe$: Subject<any> = new Subject<any>();
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private tiledeskAuthService: TiledeskAuthService,
    private projectService: ProjectService,
    private el: ElementRef,
    private dashboardService: DashboardService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.projectID = this.dashboardService.projectID;
    this.user = this.tiledeskAuthService.getCurrentUser()
    this.getUserRole();
    this.updateRulesVisibility();
    this.dashboardService.selectedChatbot$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(() => this.updateRulesVisibility());
    this.dashboardService.project$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(() => this.updateRulesVisibility());
  }

  ngOnChanges(changes: SimpleChanges){
  }

  private updateRulesVisibility(): void {
    const project: any = this.dashboardService.project;
    const profileRulesEnabled = project?.profile?.customization?.rules === true;
    this.logger.log('[CDS-SIDEBAR] - rules »»» ',  project?.profile?.customization)
    const chatbot: any = this.dashboardService.selectedChatbot;
    const rules = chatbot?.attributes?.rules;
    const hasConfiguredRules = Array.isArray(rules) && rules.length > 0;

    this.showRulesButton = profileRulesEnabled || hasConfiguredRules;
  }

  get isRulesRouteActive(): boolean {
    return this.router.url.includes('/rules');
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }


  getUserRole(){
    this.projectService.getProjectUserByUserId(this.projectID, this.user.uid).pipe( takeUntil(this.unsubscribe$)).subscribe((projectUser: ProjectUser) => {
      this.logger.log('[CDS-SIDEBAR] - SUBSCRIPTION TO USER ROLE »»» ', projectUser)
      if (projectUser.role !== undefined) {
        this.USER_ROLE = projectUser.role;
      }
    })
  }


  onMenuOptionFN(item: { key: string, label: string, icon: string, src?: string}){
    switch(item.key){
      case 'FEEDBACK':
      case 'CHANGELOG':
        window.open(item.src, '_blank')
        break;
      case 'SUPPORT':
        this.router.navigate(['./support'], {relativeTo: this.route})
        // this.onClickItemList.emit(SIDEBAR_PAGES.SUPPORT)
        // window.open(item.src, '_self')
    }
  }

}
