import { Chatbot } from 'src/app/models/faq_kb-model';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DashboardService } from 'src/app/services/dashboard.service';
import { FaqService } from 'src/app/services/faq.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { downloadObjectAsJson } from 'src/app/utils/util';
import { AppConfigService } from 'src/app/services/app-config';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { UserModel } from 'src/chat21-core/models/user';
import { environment } from 'src/environments/environment';
import { TYPE_URL } from '../../utils';
import { BRAND_BASE_INFO } from '../../utils-resources';


@Component({
  selector: 'cds-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class CDSMenuComponent implements OnInit {

  @Input() items: Array<{ key: string, label: string, icon: string, type: TYPE_URL, status?: string, src?: string, localIcon?: boolean}>;
  @Input() menuType: 'header' | 'sidebar' = 'header';
  @Input() menuTitle: 'string'
  @Output() onMenuOption = new EventEmitter();
  
  TYPE_URL = TYPE_URL;
  selectedChatbot: Chatbot;
  loggedUser: UserModel;

  version: string;
  BRAND_BASE_INFO = BRAND_BASE_INFO;
  private logger: LoggerService = LoggerInstance.getInstance()

  constructor(
    private dashboardService: DashboardService,
    private appConfigService: AppConfigService,
    private tiledeskAuthService: TiledeskAuthService
  ) {
    this.selectedChatbot = this.dashboardService.selectedChatbot
    this.version = environment.VERSION
   }

  ngOnInit(): void {
    this.loggedUser = this.tiledeskAuthService.getCurrentUser();
  }

  ngOnChanges(){
    if(this.items){
      this.items = this.items.filter(el => el.status !== 'inactive')
      this.items.map((el)=> {
        el.localIcon = false
        if(el.icon && el.icon.match(new RegExp(/(?=.*?assets|http|https\b)^.*$/))){
          el.localIcon =true
        }
      })
    }
  }


  onItemClick(item: { label: string, icon: string, src?: string}){
    this.onMenuOption.emit(item)
  }
}
