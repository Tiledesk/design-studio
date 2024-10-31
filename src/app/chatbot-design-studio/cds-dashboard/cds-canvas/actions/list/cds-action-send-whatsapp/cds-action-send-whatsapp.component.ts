import { Component, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActionSendWhatsapp } from 'src/app/models/action-model';
import { Intent } from 'src/app/models/intent-model';
import { DashboardService } from 'src/app/services/dashboard.service';
import { WhatsappService } from 'src/app/services/whatsapp.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

@Component({
  selector: 'cds-action-send-whatsapp',
  templateUrl: './cds-action-send-whatsapp.component.html',
  styleUrls: ['./cds-action-send-whatsapp.component.scss']
})
export class CdsActionSendWhatsappComponent implements OnInit {

  @Input() action: ActionSendWhatsapp;
  @Input() intentSelected: Intent;
  @Input() previewMode: boolean = true;
  @Output() updateAndSaveAction = new EventEmitter();

  project_id: string;

  templates_list = [];
  // receiver_list = [];

  phone_number_id: string;
  showLoader: Boolean = false;
  selected_template: any;
  payload: any;

  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private dashboardService: DashboardService,
    private whatsapp: WhatsappService,
    public el: ElementRef
  ) { }

  ngOnInit(): void {
    this.project_id = this.dashboardService.projectID
    if (this.previewMode == false) {
      this.logger.log("Whatsapp static project_id: ", this.project_id);
      this.showLoader = true;
      this.getTemplates();
    }
  }

  getTemplates() {
    this.whatsapp.getAllTemplates().subscribe({ next:(templates: any[]) => {

      this.templates_list = templates.map(t => {
        if (t.category === 'MARKETING') {
          t.icon = "campaign"
        }
        else {
          t.icon = "notifications_active"
        }
        t.description = t.components.find(c => c.type === 'BODY').text;
        return t;
      })

    }, error: (error) => {
      this.showLoader = false;
      this.logger.log("[SEND WHATSAPP] error get templates: ", error);
    }, complete: () => {
      this.logger.log("[SEND WHATSAPP] get templates completed: ");
      if (this.action.templateName) {
        this.selected_template = this.templates_list.find(t => t.name === this.action.templateName);
      }
      this.showLoader = false;
    }})
  }

  onChangeSelect(event) {
    this.logger.debug("[ACTION SEND WHATSAPP] onChangeSelect event", event);
    this.selected_template = event;
    this.action.templateName = this.selected_template.name;
    this.action.payload.template.name = this.selected_template.name;
    this.action.payload.template.language = this.selected_template.language;
    this.action.payload.receiver_list = [];
    this.addReceiver();
    this.updateAndSaveAction.emit();
  }

  addReceiver() {
    this.action.payload.receiver_list.push({ phone_number: null });
  }

  onChangeTextarea(event){
    if(event){
      this.phone_number_id = event
      let element = document.getElementById('phone-number-id');
      element.classList.remove('is-invalid');
      var reg = new RegExp('^[0-9]+$');
      if (!reg.test(this.phone_number_id)) {
        element.classList.add('is-invalid');
      } else {
        this.action.payload.phone_number_id = this.phone_number_id;
        this.updateAndSaveAction.emit();
      }

      this.logger.debug("[ACTION WHATSAPP] Action updated ", this.action.payload);
    }
  }

  onReceiverEmitted(event, index) {
    // update receiver
    this.action.payload.receiver_list[index] = event;
    this.logger.log("[ACTION WHATSAPP] Action updated ", this.action.payload);
    this.updateAndSaveAction.emit()
  }

}
