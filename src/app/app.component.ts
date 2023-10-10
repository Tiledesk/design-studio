import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { AppConfigService } from './services/app-config';
import { TranslateService } from '@ngx-translate/core';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { environment } from 'src/environments/environment';
import { getParameterByName } from 'src/chat21-core/utils/utils';
import { tranlatedLanguage } from 'src/chat21-core/utils/constants';
import { ProjectService } from './services/projects.service';
import { UploadService } from 'src/chat21-core/providers/abstract/upload.service';
import { DepartmentService } from './services/department.service';
import { DashboardService } from './services/dashboard.service';
import { Project } from './models/project-model';
import { Chatbot } from './models/faq_kb-model';
import { FaqKbService } from './services/faq-kb.service';
import { FaqService } from './services/faq.service';
import { UsersService } from './services/users.service';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { OpenaiService } from './services/openai.service';
import { WhatsappService } from './services/whatsapp.service';
import { MultichannelService } from './services/multichannel.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  
  private logger: LoggerService = LoggerInstance.getInstance();
  public persistence: string;
  public lang: string; 
  IS_ONLINE: boolean;
  initFinished:boolean = false;


  constructor(
    private appConfigService: AppConfigService,
    public translate: TranslateService,
    public tiledeskAuthService: TiledeskAuthService,
    private router: Router,
    private route: ActivatedRoute,
    public appStorageService: AppStorageService,
    public projectService: ProjectService,
    // public uploadService: UploadService,
    // public dashboardService: DashboardService,
    private userService: UsersService,
    private multiChannelService: MultichannelService,
    private uploadService: UploadService
  ){

  }
  
  ngOnInit(): void {
    const appconfig = this.appConfigService.getConfig();
    this.logger.log('[APP-COMP] ngOnInit  appconfig', appconfig)
    this.persistence = appconfig.authPersistence;
    this.appStorageService.initialize(environment.storage_prefix, this.persistence, '')

    this.logger.setLoggerConfig(true, appconfig.logLevel)
    this.logger.info('[APP-COMP] logLevel: ', appconfig.logLevel);

    const token = getParameterByName('jwt')
    if (token) {
      // this.isOnline = false;
      // this.logger.log('[APP-COMP] ngOnInit AUTOLOGIN token get with this.isOnline  ', this.isOnline)
      this.logger.log('[APP-COMP] ngOnInit AUTOLOGIN token get with getParameterByName  ', token)
      // save token in local storage then 

      const storedToken = this.appStorageService.getItem('tiledeskToken');
      this.logger.log('[APP-COMP] ngOnInit AUTOLOGIN storedToken ', storedToken)
      this.logger.log('[APP-COMP] ngOnInit AUTOLOGIN SAVE THE PARAMS TOKEN ', token)
      if (storedToken !== token) {
        this.appStorageService.setItem('tiledeskToken', token);
      } else {
        this.logger.log('[APP-COMP] ngOnInit AUTOLOGIN the current user already exist DON\'T SAVE ')
      }
    }

    this.initialize()
    


  }


  private async initialize(){
    let serverBaseURL = this.appConfigService.getConfig().apiUrl

    this.tiledeskAuthService.initialize(serverBaseURL);
    this.projectService.initialize(serverBaseURL);
    this.uploadService.initialize();
    // this.departmentService.initialize(serverBaseURL, this.project._id);
    // this.faqKbService.initialize(serverBaseURL, this.project._id)
    // this.faqService.initialize(serverBaseURL, this.project._id)
    // this.kbService.initialize(serverBaseURL, this.project._id)
    // this.openaiService.initialize(serverBaseURL, this.project._id)
    // this.whatsappService.initialize(serverBaseURL, this.project._id)
    this.multiChannelService.initialize(serverBaseURL)
    this.userService.initialize(serverBaseURL)



    // const getUrlParams = await this.dashboardService.getUrlParams();
    // this.logger.log('[CDS DSHBRD] Risultato 2:', getUrlParams);

    await this.initAuthentication();
    this.setLanguage(null);

  }


  /**************** CUSTOM FUNCTIONS ****************/
  /** 
   * execute Async Functions In Sequence
   * Le funzioni async sono gestite in maniera sincrona ed eseguite in coda
   * da aggiungere un loader durante il processo e se tutte vanno a buon fine 
   * possiamo visualizzare lo stage completo
   */

  signInWithCustomToken(token) {
    // this.isOnline = false;
    this.logger.log('[APP-COMP] SIGNINWITHCUSTOMTOKEN  token', token)
    this.tiledeskAuthService.signInWithCustomToken(token).then((user: any) => {
        this.logger.log('[APP-COMP] SIGNINWITHCUSTOMTOKEN AUTLOGIN user', user)
    }).catch(error => {
        this.logger.error('[APP-COMP] SIGNINWITHCUSTOMTOKEN error::', error)
    })
  }


  /** */
  setLanguage(currentUser) {
    // const currentUser = JSON.parse(this.appStorageService.getItem('currentUser'));
    this.logger.log('[APP-COMP] - setLanguage current_user uid: ', currentUser);

    let currentUserId = ''
    if (currentUser) {
      currentUserId = currentUser.uid;
      this.logger.log('[APP-COMP] - setLanguage current_user uid: ', currentUserId);
    }
    // this.translate.setDefaultLang('en');
    //   this.translate.use('en');

    const browserLang = this.translate.getBrowserLang();
    this.logger.log('[APP-COMP] browserLang: ', browserLang);
    const stored_preferred_lang = localStorage.getItem(currentUserId + '_lang');
    this.logger.log('[APP-COMP] stored_preferred_lang: ', stored_preferred_lang);

    let chat_lang = ''
    if (browserLang && !stored_preferred_lang) {
      chat_lang = browserLang
    } else if (browserLang && stored_preferred_lang) {
      chat_lang = stored_preferred_lang
    }

    if (tranlatedLanguage.includes(chat_lang)) {
      this.logger.log('[APP-COMP] tranlatedLanguage includes', chat_lang, ': ', tranlatedLanguage.includes(chat_lang))
      this.translate.setDefaultLang(chat_lang)
      this.translate.use(chat_lang);
    }
    else {
      this.logger.log('[APP-COMP] tranlatedLanguage not includes', chat_lang, ': ', tranlatedLanguage.includes(chat_lang))
      chat_lang = 'en'
      this.translate.setDefaultLang('en');
      this.translate.use('en');
    }
    this.lang=chat_lang

  }

  updateStoredCurrentUser() {
    const storedCurrentUser = this.appStorageService.getItem('currentUser')
    const storedDshbrdUser = localStorage.getItem('user')
    this.logger.log('[APP-COMP] updateStoredCurrentUser - stored currentUser', storedCurrentUser)
    this.logger.log('[APP-COMP] updateStoredCurrentUser - stored dshbrdUser', storedDshbrdUser)
    if ((storedCurrentUser && storedCurrentUser !== 'undefined') && (storedDshbrdUser && storedDshbrdUser !== 'undefined')) {
      const currentUser = JSON.parse(storedCurrentUser);
      const dshbrdUser = JSON.parse(storedDshbrdUser);
      if (currentUser && dshbrdUser) {
        if (currentUser.color !== dshbrdUser.fillColour) {
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.color !== dshbrdUser.fillColour')
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.color ', currentUser.color)
          this.logger.log('[APP-COMP] updateStoredCurrentUser - dshbrdUser.fillColour ', dshbrdUser.fillColour)
          currentUser.color = dshbrdUser.fillColour;
        } else {
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.color === dshbrdUser.fillColour')
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.color ', currentUser.color)
          this.logger.log('[APP-COMP] updateStoredCurrentUser - dshbrdUser.fillColour ', dshbrdUser.fillColour)
        }
        if (currentUser.firstname !== dshbrdUser.firstname) {
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.firstname !== dshbrdUser.firstname')
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.firstname ', currentUser.firstname)
          this.logger.log('[APP-COMP] updateStoredCurrentUser - dshbrdUser.firstname ', dshbrdUser.firstname)
          currentUser.firstname = dshbrdUser.firstname;
        } else {
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.firstname === dshbrdUser.firstname')
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.firstname ', currentUser.firstname)
          this.logger.log('[APP-COMP] updateStoredCurrentUser - dshbrdUser.firstname ', dshbrdUser.firstname)
        }
        if (currentUser.lastname !== dshbrdUser.lastname) {
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.lastname !== dshbrdUser.lastname')
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.lastname ', currentUser.lastname)
          this.logger.log('[APP-COMP] updateStoredCurrentUser - dshbrdUser.lastname ', dshbrdUser.lastname)
          currentUser.lastname = dshbrdUser.lastname;
        } else {
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.lastname === dshbrdUser.lastname')
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.lastname ', currentUser.lastname)
          this.logger.log('[APP-COMP] updateStoredCurrentUser - dshbrdUser.lastname ', dshbrdUser.lastname)
        }
        if (currentUser.avatar !== dshbrdUser.fullname_initial) {
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.avatar !== dshbrdUser.fullname_initial')
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.avatar ', currentUser.avatar)
          this.logger.log('[APP-COMP] updateStoredCurrentUser - dshbrdUser.fullname_initial ', dshbrdUser.fullname_initial)
          currentUser.avatar = dshbrdUser.fullname_initial
        } else {
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.avatar === dshbrdUser.fullname_initial')
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.avatar ', currentUser.avatar)
          this.logger.log('[APP-COMP] updateStoredCurrentUser - dshbrdUser.fullname_initial ', dshbrdUser.fullname_initial)
        }
        let fullname = ""
        if (dshbrdUser.firstname && !dshbrdUser.lastname) {
          fullname = dshbrdUser.firstname
        } else if (dshbrdUser.firstname && dshbrdUser.lastname) {
          fullname = dshbrdUser.firstname + ' ' + dshbrdUser.lastname
          this.logger.log('[APP-COMP] updateStoredCurrentUser - fullname ', fullname)
        }
        if (fullname !== currentUser.fullname) {
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.fullname !== dshbrdUser.fullname ')
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.fullname  ', fullname)
          this.logger.log('[APP-COMP] updateStoredCurrentUser - dshbrdUser.fullname ', currentUser.fullname)
          currentUser.fullname = fullname
        } else {
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.fullname === dshbrdUser.fullname ')
          this.logger.log('[APP-COMP] updateStoredCurrentUser - currentUser.fullname  ', fullname)
          this.logger.log('[APP-COMP] updateStoredCurrentUser - dshbrdUser.fullname ', currentUser.fullname)
        }
        this.appStorageService.setItem('currentUser', JSON.stringify(currentUser));
        this.tiledeskAuthService.setCurrentUser(currentUser);
      }
    } else {
      this.logger.error('[APP-COMP] updateStoredCurrentUser - currentuser or dashboarduser not found in storage')
    }
  }

  /***************************************************+*/
  /**------- AUTHENTICATION FUNCTIONS --> START <--- +*/
  initAuthentication() {
    const tiledeskToken = this.appStorageService.getItem('tiledeskToken')

    this.logger.log('[APP-COMP] >>> INIT-AUTHENTICATION !!! ')
    this.logger.log('[APP-COMP] >>> initAuthentication tiledeskToken ', tiledeskToken)
    // const currentUser = JSON.parse(this.appStorageService.getItem('currentUser'));
    // this.logger.log('[APP-COMP] >>> initAuthentication currentUser ', currentUser)
    if (tiledeskToken) {
      this.logger.log('[APP-COMP] >>> initAuthentication I LOG IN WITH A TOKEN EXISTING IN THE LOCAL STORAGE OR WITH A TOKEN PASSED IN THE URL PARAMETERS <<<')
      this.tiledeskAuthService.signInWithCustomToken(tiledeskToken).then(user => {
        this.logger.log('[APP-COMP] >>> initAuthentication user ', user)

        this.updateStoredCurrentUser()
        this.IS_ONLINE = true;
      }).catch(error => {
        this.logger.error('[APP-COMP] initAuthentication SIGNINWITHCUSTOMTOKEN error::', error)
      })
    } else {
      this.logger.warn('[APP-COMP] >>> I AM NOT LOGGED IN <<<')
      this.IS_ONLINE = false;
      // this.goToDashboardLogin()
    }
  }


  goToDashboardLogin(){
    let DASHBOARD_URL = this.appConfigService.getConfig().dashboardBaseUrl + '#/login'
    const myWindow = window.open(DASHBOARD_URL, '_self');
    myWindow.focus();
  }

  ngAfterViewInit(): void {
    
  }

  ngOnDestroy(): void {
    
  }

  

  

}
