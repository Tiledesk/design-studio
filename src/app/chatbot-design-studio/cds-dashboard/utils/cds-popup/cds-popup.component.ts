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
  position: { left: number, right: number, top: number, bottom: number;} = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
  }

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
      this.setPosition()
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

  setPosition(){
    setTimeout(() => {
      let publishBtnEl = document.getElementById('cds-publish-btn-wrp')
      if(publishBtnEl){
        let btnPosition = publishBtnEl.getBoundingClientRect()
        this.position = {
          top: btnPosition.top + btnPosition.height + 10,
          bottom: btnPosition.bottom,
          left: btnPosition.left + Math.floor(btnPosition.width / 2) - 160,
          right: 110
          // right: btnPosition.right - Math.floor(btnPosition.width / 2) - 160
        }
      }
    }, 0);
    
  }

}
