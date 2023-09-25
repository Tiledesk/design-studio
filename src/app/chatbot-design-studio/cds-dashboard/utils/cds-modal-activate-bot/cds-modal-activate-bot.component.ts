import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

import { DepartmentService } from 'app/services/department.service';
import { LoggerService } from 'app/services/logger/logger.service';

@Component({
  selector: 'cds-modal-activate-bot',
  templateUrl: './cds-modal-activate-bot.component.html',
  styleUrls: ['./cds-modal-activate-bot.component.scss']
})
export class CdsModalActivateBotComponent implements OnInit {

  @Input() selectedChatbot;

  id_faq_kb: string;
  defaultDepartmentId: string;
  displayModalAttacchBotToDept: string = 'none';
  DISPLAY_SELECT_DEPTS_WITHOUT_BOT: boolean;
  PRESENTS_MODAL_ATTACH_BOT_TO_DEPT: boolean = false;
  depts_without_bot_array = [];
  selected_bot_id: string;
  selected_bot_name: string;
  dept_id: string;
   HAS_CLICKED_HOOK_BOOT_TO_DEPT: boolean = false;
  HAS_COMPLETED_HOOK_BOOT_TO_DEPT: boolean = false;
  HAS_COMPLETED_HOOK_BOOT_TO_DEPT_SUCCESS: boolean = false;
  HAS_COMPLETED_HOOK_BOOT_TO_DEPT_ERROR: boolean = false;

  constructor(
    private logger: LoggerService,
    private departmentService: DepartmentService
  ) { }

  ngOnInit(): void {
    this.getDeptsByProjectId();
  }

  onCloseModalAttacchBotToDept() {
    this.displayModalAttacchBotToDept = 'none'
  }


  getDeptsByProjectId() {
    this.departmentService.getDeptsByProjectId().subscribe((departments: any) => {
      this.logger.log('[CDS DSBRD] - DEPT GET DEPTS ', departments);
      this.logger.log('[CDS DSBRD] - DEPT BOT ID ', this.id_faq_kb);

      if (departments) {
        departments.forEach((dept: any) => {
          // this.logger.log('[CDS DSBRD] - DEPT', dept);
          if (dept.default === true) {
            this.defaultDepartmentId = dept._id;
            this.logger.log('[CDS DSBRD] - DEFAULT DEPT ID ', this.defaultDepartmentId);
          }
        })
        const depts_length = departments.length
        this.logger.log('[CDS DSBRD] ---> GET DEPTS DEPTS LENGHT ', depts_length);

        if (depts_length === 1) {
          this.DISPLAY_SELECT_DEPTS_WITHOUT_BOT = false;
          this.dept_id = departments[0]['_id']

          this.logger.log('[CDS DSBRD]  --->  DEFAULT DEPT HAS BOT ', departments[0].hasBot);
          if (departments[0].hasBot === true) {

            this.logger.log('[CDS DSBRD] --->  DEFAULT DEPT HAS BOT ');
            // this.DISPLAY_BTN_ACTIVATE_BOT_FOR_NEW_CONV = false;
            // this.PRESENTS_MODAL_ATTACH_BOT_TO_DEPT = false
            // this.logger.log('Bot Create --->  DEFAULT DEPT HAS BOT DISPLAY_BTN_ACTIVATE_BOT_FOR_NEW_CONV ', this.DISPLAY_BTN_ACTIVATE_BOT_FOR_NEW_CONV);
            this.logger.log('[CDS DSBRD] --->  DEFAULT DEPT HAS BOT PRESENTS_MODAL_ATTACH_BOT_TO_DEPT ', this.PRESENTS_MODAL_ATTACH_BOT_TO_DEPT);
          } else {
            this.PRESENTS_MODAL_ATTACH_BOT_TO_DEPT = true;
            this.logger.log('[CDS DSBRD] --->  DEFAULT DEPT HAS BOT PRESENTS_MODAL_ATTACH_BOT_TO_DEPT ', this.PRESENTS_MODAL_ATTACH_BOT_TO_DEPT);
          }
        }

        if (depts_length > 1) {
          this.DISPLAY_SELECT_DEPTS_WITHOUT_BOT = true;
          departments.forEach(dept => {

            if (dept.hasBot === true) {
              this.logger.log('[CDS DSBRD] --->  DEPT HAS BOT ');
              this.logger.log('[CDS DSBRD] --->  DEPT HAS BOT PRESENTS_MODAL_ATTACH_BOT_TO_DEPT ', this.PRESENTS_MODAL_ATTACH_BOT_TO_DEPT);
            } else {

              this.PRESENTS_MODAL_ATTACH_BOT_TO_DEPT = true;

              this.logger.log('[CDS DSBRD] --->  DEPT HAS BOT PRESENTS_MODAL_ATTACH_BOT_TO_DEPT ', this.PRESENTS_MODAL_ATTACH_BOT_TO_DEPT);

              this.depts_without_bot_array.push({ id: dept._id, name: dept.name })
            }

          });

          this.logger.log('[CDS DSBRD] --->  DEPT ARRAY OF DEPT WITHOUT BOT ', this.depts_without_bot_array);
        }

      }
    }, error => {
      this.logger.error('[CDS DSBRD] - DEPT - GET DEPTS  - ERROR', error);
    }, () => {
      this.logger.log('[CDS DSBRD] - DEPT - GET DEPTS - COMPLETE')
    });
  }

  onSelectBotId() {
    this.logger.log('[CDS DSBRD] --->  onSelectBotId ', this.selected_bot_id);
    this.dept_id = this.selected_bot_id
    const hasFound = this.depts_without_bot_array.filter((obj: any) => {
      return obj.id === this.selected_bot_id;
    });
    this.logger.log('[CDS DSBRD]  onSelectBotId found', hasFound);

    if (hasFound.length > 0) {
      this.selected_bot_name = hasFound[0]['name']
    }
  }

  hookBotToDept() {
    this.HAS_CLICKED_HOOK_BOOT_TO_DEPT = true;
    this.departmentService.updateExistingDeptWithSelectedBot(this.dept_id, this.selectedChatbot._id).subscribe((res) => {
      this.logger.log('[BOT-CREATE] Bot Create - UPDATE EXISTING DEPT WITH SELECED BOT - RES ', res);
    }, (error) => {
      this.logger.error('[BOT-CREATE] Bot Create - UPDATE EXISTING DEPT WITH SELECED BOT - ERROR ', error);

      this.HAS_COMPLETED_HOOK_BOOT_TO_DEPT = true
      this.HAS_COMPLETED_HOOK_BOOT_TO_DEPT_ERROR = true;

      this.logger.error('[BOT-CREATE] Bot Create - UPDATE EXISTING DEPT WITH SELECED BOT - ERROR - HAS_COMPLETED_HOOK_BOOT_TO_DEPT', this.HAS_COMPLETED_HOOK_BOOT_TO_DEPT);
    }, () => {
      this.logger.log('[BOT-CREATE] Bot Create - UPDATE EXISTING DEPT WITH SELECED BOT - COMPLETE ');

      this.HAS_COMPLETED_HOOK_BOOT_TO_DEPT = true
      this.HAS_COMPLETED_HOOK_BOOT_TO_DEPT_SUCCESS = true;
      this.logger.log('[BOT-CREATE] Bot Create - UPDATE EXISTING DEPT WITH SELECED BOT - COMPLETE - HAS_COMPLETED_HOOK_BOOT_TO_DEPT', this.HAS_COMPLETED_HOOK_BOOT_TO_DEPT);
    });
  }
}
