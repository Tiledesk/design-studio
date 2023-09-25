import { Component, OnInit } from '@angular/core';
import { LoggerService } from 'app/services/logger/logger.service';
import { LocalDbService } from 'app/services/users-local-db.service';

@Component({
  selector: 'cds-popup',
  templateUrl: './cds-popup.component.html',
  styleUrls: ['./cds-popup.component.scss']
})
export class CdsPopupComponent implements OnInit {

  popup_visibility = 'none';

  constructor(
    private logger: LoggerService,
    public usersLocalDbService: LocalDbService
  ) { }

  ngOnInit(): void {
    this.diplayPopup();
  }


  /* POP UP */
  diplayPopup() {
    const hasClosedPopup = this.usersLocalDbService.getFromStorage('hasclosedcdspopup')
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
    this.usersLocalDbService.setInStorage('hasclosedcdspopup', 'true')
    this.popup_visibility = 'none'
  }

}
