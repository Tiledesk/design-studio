import { Component, OnInit } from '@angular/core';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-popup',
  templateUrl: './cds-popup.component.html',
  styleUrls: ['./cds-popup.component.scss']
})
export class CdsPopupComponent implements OnInit {

  popup_visibility = 'none';

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    public appStorageService: AppStorageService
  ) { }

  ngOnInit(): void {
    this.diplayPopup();
  }


  /* POP UP */
  diplayPopup() {
    const hasClosedPopup = this.appStorageService.getItem('hasclosedcdspopup')
    this.logger.log('[CDS DSBRD] hasClosedPopup', hasClosedPopup)
    if (hasClosedPopup === null) {
      this.popup_visibility = 'block'
      this.logger.log('[CDS DSBRD] popup_visibility', this.popup_visibility)
    }
    if (hasClosedPopup === 'true') {
      this.popup_visibility = 'none'
    }
  }


  closeRemenberToPublishPopup() {
    this.logger.log('[CDS DSBRD] closeRemenberToPublishPopup')
    this.appStorageService.setItem('hasclosedcdspopup', 'true')
    this.popup_visibility = 'none'
  }

}
