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

@Component({
  selector: 'cds-sidebar',
  templateUrl: './cds-sidebar.component.html',
  styleUrls: ['./cds-sidebar.component.scss']
})
export class CdsSidebarComponent implements OnInit {

  @Input() IS_OPEN_SIDEBAR: boolean;
  @Input() activeSidebarSection: SIDEBAR_PAGES;
  // @Input() projectID: string;
  @Output() onClickItemList = new EventEmitter<string>();

  projectID: string;
  user: UserModel
  SIDEBAR_PAGES = SIDEBAR_PAGES;
  USER_ROLE: any;
  IS_OPEN: boolean = true;
  INFO_MENU_ITEMS = INFO_MENU_ITEMS;
  
  private unsubscribe$: Subject<any> = new Subject<any>();
  
  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    private tiledeskAuthService: TiledeskAuthService,
    private projectService: ProjectService,
    private el: ElementRef,
    private dashboardService: DashboardService
  ) { }

  ngOnInit(): void {
    this.projectID = this.dashboardService.projectID;
    this.user = this.tiledeskAuthService.getCurrentUser()
    this.getUserRole();
    this.goTo(SIDEBAR_PAGES.INTENTS);
  }

  ngOnChanges(changes: SimpleChanges){
    if(changes && changes['activeSidebarSection'] && changes['activeSidebarSection'].currentValue !== changes['activeSidebarSection'].previousValue ){
      this.goTo(this.activeSidebarSection)
    }
  }


  getUserRole(){
    this.projectService.getProjectUserByUserId(this.projectID, this.user.uid).pipe( takeUntil(this.unsubscribe$)).subscribe((projectUser: ProjectUser) => {
      this.logger.log('[CDS-SIDEBAR] - SUBSCRIPTION TO USER ROLE »»» ', projectUser)
      if (projectUser.role !== undefined) {
        this.USER_ROLE = projectUser.role;
      }
    })
  }

  goTo(section: SIDEBAR_PAGES) {
    // console.log('[CDS-SIDEBAR] goTo item ', section)

    // let elements = Array.from(document.getElementsByClassName('section is_active'));
    let elements = this.el.nativeElement.querySelectorAll('.section.is_active')
    if (elements.length != 0) {
      elements.forEach((el) => {
        el.classList.remove('is_active');
      })
    }

    const element = this.el.nativeElement.querySelector('#'+section);
    element.classList.toggle("is_active");

    this.onClickItemList.emit(section)
  }


  onMenuOptionFN(item: { key: string, label: string, icon: string, src?: string}){
    switch(item.key){
      case 'HELP_CENTER':
      case 'ROAD_MAP':
      case 'FEEDBACK':
      case 'CHANGELOG':
      case 'GITHUB':
        window.open(item.src, '_blank')
        break;
      case 'SUPPORT':
        this.onClickItemList.emit(SIDEBAR_PAGES.SUPPORT)
        // window.open(item.src, '_self')
    }
  }

}
