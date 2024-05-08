import { Component, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { BrandService } from 'src/app/services/brand.service';
import { FaqKbService } from 'src/app/services/faq-kb.service';
import { NotifyService } from 'src/app/services/notify.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { EXTERNAL_URL } from '../../utils';

@Component({
  selector: 'cds-detail-developer',
  templateUrl: './developer.component.html',
  styleUrls: ['./developer.component.scss']
})
export class CDSDetailDeveloperComponent implements OnInit {

  @Input() selectedChatbot: Chatbot

  WEBHOOK_URL_IS_EMPTY: boolean;
  WEBHOOK_URL_HAS_ERROR: boolean;
  WEBHOOK_URL_IS_HTTPS: boolean;
  WEBHOOK_URL_IS_VALID: boolean;
  WEBHOOK_URL_IS_HTTP_or_HTTPS: boolean;

  public jwt: string;
  public tparams: any;

  EXTERNAL_URL = EXTERNAL_URL

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private faqKbService: FaqKbService,
    private brandService: BrandService,
    private translate: TranslateService,
    private notify: NotifyService
  ) { 
    const brand = brandService.getBrand();
    this.tparams = brand;
  }

  ngOnInit(): void {
  }

  generateToken(){
    this.logger.log('[CDS-DETAIL-DEVELOPER] generateToken for chatbot', this.selectedChatbot._id)
    this.faqKbService.getJWT(this.selectedChatbot._id).subscribe((data) => {
      if(data && data['jwt']){
        this.jwt = data['jwt']
      }
      this.logger.log('[CDS-DETAIL-DEVELOPER] generateToken - RES ', data)
    }, (error) => {
      this.logger.error('[CDS-DETAIL-DEVELOPER] generateToken ERROR ', error);
    }, () => {
      this.logger.log('[CDS-DETAIL-DEVELOPER] generateToken * COMPLETE *');
    });
  }

  copyToClipBoard(){
    if(this.jwt){
      navigator.clipboard.writeText(this.jwt)
    }
  }


  //FULFILMENT section: start
  onChangeWebhookUrl(event) {
    this.logger.log('onChangeWebhookUrl ', event);
    this.validateUrl(event)
  }

  toggleWebhook(event) {
    this.logger.log('[TILEBOT] toggleWebhook ', event.target.checked);
    this.selectedChatbot.webhook_enabled = event.target.checked;

    this.validateUrl(this.selectedChatbot.webhook_url)

    this.logger.log('[TILEBOT] validateUrl URL WEBHOOK_URL_IS_EMPTY (toggleWebhook) ', this.WEBHOOK_URL_IS_EMPTY);
    this.logger.log('[TILEBOT] validateUrl URL WEBHOOK_URL_IS_HTTPS (toggleWebhook) ', this.WEBHOOK_URL_IS_HTTPS);
    this.logger.log('[TILEBOT] validateUrl URL WEBHOOK_URL_IS_VALID (toggleWebhook) ', this.WEBHOOK_URL_IS_VALID);
    if (this.selectedChatbot.webhook_enabled === false && this.WEBHOOK_URL_IS_EMPTY === false) {

      if (this.WEBHOOK_URL_HAS_ERROR === true) {
        this.selectedChatbot.webhook_url = '';
      }
    }
  }

  validateUrl(str) {
    this.logger.log('[TILEBOT] validateUrl WEBHOOK URL ', str)
    if (str && str.length > 0) {
      this.WEBHOOK_URL_IS_EMPTY = false;
      this.logger.log('[TILEBOT] validateUrl WEBHOOK URL is EMPTY ', this.WEBHOOK_URL_IS_EMPTY)
      var url = str;

      if (url.indexOf("http://") == 0 || (url.indexOf("https://") == 0)) {
        this.WEBHOOK_URL_IS_HTTP_or_HTTPS = true
        this.WEBHOOK_URL_IS_HTTPS = false
        this.WEBHOOK_URL_HAS_ERROR = false;
        this.logger.log('[TILEBOT] validateUrl URL START WITH HTTP ', this.WEBHOOK_URL_IS_HTTPS)
        this.checkIfIsValidUrl(str)

      } else {
        this.WEBHOOK_URL_IS_HTTP_or_HTTPS = false
      }

    } else {
      this.WEBHOOK_URL_IS_EMPTY = true;
      this.WEBHOOK_URL_HAS_ERROR = true;
    }
  }

  checkIfIsValidUrl(str) {
    var pattern = /^(http|https):\/\/(([a-zA-Z0-9$\-_.+!*'(),;:&=]|%[0-9a-fA-F]{2})+@)?(((25[0-5]|2[0-4][0-9]|[0-1][0-9][0-9]|[1-9][0-9]|[0-9])(\.(25[0-5]|2[0-4][0-9]|[0-1][0-9][0-9]|[1-9][0-9]|[0-9])){3})|localhost|([a-zA-Z0-9\-\u00C0-\u017F]+\.)+([a-zA-Z]{2,}))(:[0-9]+)?(\/(([a-zA-Z0-9$\-_.+!*'(),;:@&=]|%[0-9a-fA-F]{2})*(\/([a-zA-Z0-9$\-_.+!*'(),;:@&=]|%[0-9a-fA-F]{2})*)*)?(\?([a-zA-Z0-9$\-_.+!*'(),;:@&=\/?]|%[0-9a-fA-F]{2})*)?(\#([a-zA-Z0-9$\-_.+!*'(),;:@&=\/?]|%[0-9a-fA-F]{2})*)?)?$/; // fragment locator

    // this.logger.log('[TILEBOT] validateUrl URL - URL IS VALID (pattern.test)', pattern.test(str));

    // if (pattern.test(str) === true) {
    //   this.WEBHOOK_URL_IS_VALID = true;
    //   this.WEBHOOK_URL_HAS_ERROR = false;
    //   this.logger.log('[TILEBOT] validateUrl URL - URL IS VALID ', this.WEBHOOK_URL_IS_VALID);
    // } else {
    //   this.WEBHOOK_URL_IS_VALID = false;
    //   this.WEBHOOK_URL_HAS_ERROR = true;
    //   this.logger.log('[TILEBOT] validateUrl URL - URL IS VALID ', this.WEBHOOK_URL_IS_VALID);
    // }
  }

  openWebhookRequirementsDoc() {
    const url = EXTERNAL_URL.getFulFillMentDoc
    window.open(url, '_blank');
  }

  editBot() {
    // RESOLVE THE BUG 'edit button remains focused after clicking'
    // ???
    //this.elementRef.nativeElement.blur();

    this.faqKbService.updateChatbot(this.selectedChatbot).subscribe((udpatedChatbot) => {
      this.logger.log('[CDS-FULFILLMENT] EDIT BOT - CHATBOT UPDATED ', udpatedChatbot);
    }, (error) => {
      this.logger.error('[CDS-FULFILLMENT] EDIT BOT -  ERROR ', error);
      // =========== NOTIFY ERROR ===========
      this.notify.showWidgetStyleUpdateNotification(this.translate.instant('CDSSetting.UpdateBotError'), 4, 'report_problem');
    }, () => {
      this.logger.log('[TILEBOT] EDIT BOT - * COMPLETE *');
      // =========== NOTIFY SUCCESS===========
      this.notify.showWidgetStyleUpdateNotification(this.translate.instant('CDSSetting.UpdateBotSuccess'), 2, 'done');
    })


  }

}
