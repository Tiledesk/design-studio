import { Component, Input, OnInit } from '@angular/core';
import { Chatbot } from 'app/models/faq_kb-model';
import { Project } from 'app/models/project-model';
import { FaqKbService } from 'app/services/faq-kb.service';
import { LoggerService } from 'app/services/logger/logger.service';

@Component({
  selector: 'cds-detail-developer',
  templateUrl: './developer.component.html',
  styleUrls: ['./developer.component.scss']
})
export class CDSDetailDeveloperComponent implements OnInit {

  @Input() selectedChatbot: Chatbot

  public jwt: string
  constructor(
    private logger: LoggerService,
    private faqKbService: FaqKbService,
  ) { }

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

}
