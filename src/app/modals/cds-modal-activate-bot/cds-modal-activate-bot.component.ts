import { Component, OnInit, Input, Output, EventEmitter, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { DepartmentService } from 'src/app/services/department.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { Chatbot } from 'src/app/models/faq_kb-model';
import { Department } from 'src/app/models/department-model';
import { getWidgetWebInstallationScript } from 'src/app/utils/util';
import { AppConfigService } from 'src/app/services/app-config';

@Component({
  selector: 'cds-modal-activate-bot',
  templateUrl: './cds-modal-activate-bot.component.html',
  styleUrls: ['./cds-modal-activate-bot.component.scss']
})
export class CdsModalActivateBotComponent implements OnInit {


  selectedChatbot: Chatbot;
  departments: Department[]
  project_id: string;


  defaultDepartmentId: string;
  DISPLAY_SELECT_DEPTS_WITHOUT_BOT: boolean;
  DISPLAY_INSTALL_SCRIPT: boolean = false;
  // PRESENTS_MODAL_ATTACH_BOT_TO_DEPT: boolean = false;
  depts_without_bot_array = [];

  selected_bot_name: string;
  dept_id: string;
  HAS_CLICKED_HOOK_BOOT_TO_DEPT: boolean = false;
  HAS_COMPLETED_HOOK_BOOT_TO_DEPT: boolean = false;
  HAS_COMPLETED_HOOK_BOOT_TO_DEPT_SUCCESS: boolean = false;
  HAS_COMPLETED_HOOK_BOOT_TO_DEPT_ERROR: boolean = false;

  translateparamBotName: any
  DEPTS_HAS_NOT_A_BOT: boolean = false


  webScript: string;

  private logger: LoggerService = LoggerInstance.getInstance();
  
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<CdsModalActivateBotComponent>,
    private departmentService: DepartmentService,
    private appConfigService: AppConfigService,
  ) { 
    this.logger.log('[ACTIVATE-BOT-MODAL-COMPONENT] data ', data)
    this.selectedChatbot = data.chatbot
    this.departments = data.departments
    this.project_id = data.project_id
  }

  ngOnInit(): void {
    this.checkDepartmentsForProjectIdHasBot();
    const config = this.appConfigService.getConfig()
    this.translateparamBotName = { bot_name: this.selectedChatbot.name }
    this.webScript = getWidgetWebInstallationScript(this.project_id, config.widgetBaseUrl)
  }

  onCloseModalAttacchBotToDept() {
    this.dialogRef.close()
  }


  checkDepartmentsForProjectIdHasBot(){
    if(this.departments){
      this.departments.forEach((dept: any) => {
        // this.logger.log('[CDS DSBRD] - DEPT', dept);
        if (dept.default === true) {
          this.defaultDepartmentId = dept._id;
          this.logger.log('[ACTIVATE-BOT-MODAL-COMPONENT] - DEFAULT DEPT ID ', this.defaultDepartmentId);
        }
      })
      const depts_length = this.departments.length
      this.logger.log('[ACTIVATE-BOT-MODAL-COMPONENT] ---> GET DEPTS DEPTS LENGHT ', depts_length);

      if (depts_length === 1) {
        this.DISPLAY_SELECT_DEPTS_WITHOUT_BOT = false;
        this.dept_id = this.departments[0]['_id']

        this.logger.log('[ACTIVATE-BOT-MODAL-COMPONENT]  --->  DEFAULT DEPT HAS BOT ', this.departments[0].hasBot);
        if (this.departments[0].hasBot === true) {
          this.DEPTS_HAS_NOT_A_BOT = false
          this.logger.log('[ACTIVATE-BOT-MODAL-COMPONENT] --->  DEFAULT DEPT HAS BOT ');
          // this.DISPLAY_BTN_ACTIVATE_BOT_FOR_NEW_CONV = false;
          // this.logger.log('Bot Create --->  DEFAULT DEPT HAS BOT DISPLAY_BTN_ACTIVATE_BOT_FOR_NEW_CONV ', this.DISPLAY_BTN_ACTIVATE_BOT_FOR_NEW_CONV);
        }
      }

      if (depts_length > 1) {
        this.DISPLAY_SELECT_DEPTS_WITHOUT_BOT = true;
        this.DEPTS_HAS_NOT_A_BOT = false
        this.departments.forEach(dept => {
          if (dept.hasBot === true) {
           
            // this.logger.log('[CDS DSBRD] --->  DEPT HAS BOT ');
          } else {
            this.DEPTS_HAS_NOT_A_BOT = true
            this.depts_without_bot_array.push({ id: dept._id, name: dept.name })
          }

        });

        // this.logger.log('[CDS DSBRD] --->  DEPT ARRAY OF DEPT WITHOUT BOT ', this.depts_without_bot_array);
      }

    }
  }

  onSelectDept(event: {id: string, name: string}){
    this.logger.log('[ACTIVATE-BOT-MODAL-COMPONENT] --->  onSelectBotId ', event);
    this.dept_id = event.id
    const hasFound = this.depts_without_bot_array.filter((obj: any) => {
      return obj.id === this.dept_id;
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


  onCopyScript(){
    navigator.clipboard.writeText(this.webScript)
  }
}
